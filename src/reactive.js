let batchQueue = null;
let batchDepth = 0;

function startBatch() {
	if (batchDepth === 0) {
		batchQueue = [];
	}
	batchDepth++;
}

function finishBatch() {
	batchDepth--;
	if (batchDepth > 0) {
		return;
	}
	batchDepth++;
	const prev = Listener;
	try {
		for (let i = 0; i < batchQueue.length; i++) {
			const node = batchQueue[i];
			Listener = node.isStatic ? null : node;
			node.fn();
			node.needUpdate = false;
		}
	} finally {
		Listener = prev;
		batchQueue = null;
		batchDepth = 0;
	}
}

export function batch(fn) {
	startBatch();
	try {
		fn();
	} finally {
		finishBatch();
	}
}


let Listener = null;

export function _getListener() { // temporary
	return Listener;
}

/* export function _getNode(getter) { // for debug
	let node;
	getter((_, n) => { node = n });
	return node;
} */

function readNode(fn = undefined) {
	if (Listener) {
		const obsSlot = Listener.sources.length;
		Listener.sources.push(this, this.observers.length);
		this.observers.push(Listener, obsSlot);
	}
	return fn ? fn(this.value, this) : this.value;
}

function notifyNode(node) {
	const obs = node.observers;
	const length = obs.length;
	if (length === 0) {
		return;
	}
	startBatch();
	for (let i = 0; i < length; i += 2) {
		obs[i].notify();
	}
	finishBatch();
}

function writeNode(newVal) {
	if (newVal !== this.value) {
		this.value = newVal;
		notifyNode(this);
	}
	return newVal;
}

function updateNode(node) {
	const prev = Listener;
	Listener = node.isStatic ? null : node;
	try {
		const newVal = node.fn();
		node.needUpdate = false;
		return newVal;
	} finally {
		Listener = prev;
	}
}

function cleanupNode(node, destroy = false) {
	const length = node.sources.length;
	for (let i = 0; i < length; i += 2) {
		const source = node.sources[i];
		const sourceSlot = node.sources[i + 1];
		const observers = source.observers;
		const obsSlot = observers.pop();
		const obs = observers.pop();
		if (sourceSlot < observers.length) {
			obs.sources[obsSlot + 1] = sourceSlot;
			observers[sourceSlot] = obs;
			observers[sourceSlot + 1] = obsSlot;
		}
	}
	// clear sources
	if (destroy) {
		node.sources = null;
		return;
	}
	if (length > 0) {
		node.sources.splice(0);
	}
}


function createNode(value, fn, name) {
	return {
		name: name,
		fn: fn,
		needUpdate: false,
		value: value,
		notify: undefined,
		observers: undefined,
		sources: undefined,
		isStatic: false
	};
}

export function signal(initial, options = {}) {
	const set = options.set;
	const node = createNode(initial, undefined, options.name || null);
	node.observers = [];
	const write = writeNode.bind(node);
	const setter = set
		? (value) => write(set(value))
		: write;
	return [readNode.bind(node), setter];
}


export function voidSignal(name = null) {
	const node = createNode(undefined, undefined, name);
	node.observers = [];
	return [
		(value) => (readNode.call(node), value),
		() => notifyNode(node)
	];
}


function notifyEffect() {
	if (this.needUpdate) {
		return;
	}
	this.needUpdate = true;
	if (batchQueue) {
		batchQueue.push(this);
	} else {
		updateNode(this);
	}
}

function destroyEffect() {
	if (!this.sources) {
		// already destroyed
		return;
	}
	cleanupNode(this, true);
}


export function effect(fn, options = {}) {
	const node = createNode(undefined, function() {
		cleanupNode(node);
		fn();
	}, options.name || null);
	node.sources = [];
	node.notify = notifyEffect;
	updateNode(node); // probably, if we are in a batch just queue node instead
	return destroyEffect.bind(node);
}


export function untrack(fn) {
	if (Listener === null) {
		return fn();
	}	
	const prev = Listener;
	Listener = null;
	try {
		return fn();
	} finally {
		Listener = prev;
	}
}


function createSubscribeEffect(fn, name, once) {
	const node = createNode(undefined, fn, name);
	if (once) {
		node.fn = function() {
			fn();
			destroyEffect(node);
		};
	}
	node.sources = [];
	node.notify = notifyEffect;
	return node;
}

// todo: add subscribe and untrack tests
export function subscribe(getters, fn, options = {}) {
	let node;
	let defer = options.defer;
	const name = options.name || null;
	const once = options.once && defer;
	if (Array.isArray(getters)) {
		node = createSubscribeEffect( function() {
			const length = getters.length;
			const values = Array(length);
			for (let i = 0; i < length; i++) {
				values[i] = getters[i]();
			}
			Listener = null; // untrack
			if (!defer) {
				fn.apply(null, values);
			}
			// node.needUpdate = false; not needed
		}, name, once);
	} else {
		node = createSubscribeEffect( function() {
			const value = getters();
			Listener = null; // untrack
			if (!defer) {
				fn(value);
			}
			// node.needUpdate = false; not needed
		}, name, once);
	}
	updateNode(node); // probably, if we are in a batch just queue node instead
	defer = false;
	node.isStatic = true; // freeze node sources
	return destroyEffect.bind(node);
}


function readMemo() {
	if (this.needUpdate) {
		const newVal = updateNode(this);
		writeNode.call(this, newVal);
	}
	return readNode.call(this);
}

function readMemoUntracked() {
	if (this.needUpdate) {
		const newVal = updateNode(this);
		writeNode.call(this, newVal);
	}
	return this.value; // untracked read
}

function notifyMemo() {
	if (this.needUpdate) {
		return;
	}
	this.needUpdate = true;
	notifyNode(this);
}

export function memo(fn, options = {}) {
	// initial value is set to NaN - ensure equality check will fail on first evaluation
	let node;
	const name = options.name || null;
	if (options.isStatic) {
		node = createNode(NaN, function() {
			if (!node.isStatic) {
				node.isStatic = true; // freeze node sources
			}
			return fn();
		}, name);
	} else {
		node = createNode(NaN, function() {
			cleanupNode(node);
			options.x && options.x();
			return fn();
		}, name);
	}
	node.observers = [];
	node.sources = [];
	node.notify = notifyMemo;
	node.needUpdate = true;
	return options.untracked
		? readMemoUntracked.bind(node)
		: readMemo.bind(node);
}

// static untracked memo
export function sMemo(fn) {
	return memo(fn, {isStatic: true, untracked: true});
}


export function pipeProp(value, setter) {
	return setter
		? [value, setter]
		: signal(value);
}
