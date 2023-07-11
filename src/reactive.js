let batchQueue = null;
let batchDepth = 0;

export function batch(fn) {
	if (batchDepth === 0) {
		batchQueue = [];
	}
	batchDepth++;
	try {
		fn();
	} finally {
		batchDepth--;
	}
	if (batchDepth === 0) {
		const queue = batchQueue;
		batchQueue = null;
		const length = queue.length;
		const prev = Listener;
		try {
			for (let i = 0; i < length; i++) {
				const node = queue[i];
				Listener = node.isStatic ? null : node;
				node.fn();
				node.needUpdate = false;
			}
		} finally {
			Listener = prev;
		}
	}
}


let Listener = null;

function readNode() {
	if (Listener) {
		const index = Listener.sources.length;
		Listener.sources.push(this, this.observers.length);
		this.observers.push(Listener, index);
	}
	return this.value;
}

function notifyNode(node) {
	const obs = node.observers;
	const length = obs.length;
	for (let i = 0; i < length; i += 2) {
		obs[i].notify();
	}
}

function writeNode(newVal) {
	if (newVal !== this.value) {
		this.value = newVal;
		notifyNode(this);
	}
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
		const obs = observers.pop();
		const obsSlot = observers.pop();
		if (sourceSlot < observers.length) {
			observers[sourceSlot] = obs;
			observers[sourceSlot + 1] = obsSlot;
		}
	}
	// clear sources
	if (destroy) {
		node.sources = null;
		return;
	}
	node.sources.splice(0);
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

export function signal(initial, name = null) {
	const node = createNode(initial, undefined, name);
	node.observers = [];
	return [readNode.bind(node), writeNode.bind(node)];
}


function notifyEffect() {
	if (this.needUpdate) {
		return;
	}
	this.needUpdate = true;
	if (!this.isStatic) {
		cleanupNode(this);
	}
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

function createEffect(fn, options) {
	const node = createNode(undefined, fn, options.name || null);
	if (options.once) {
		node.fn = function() {
			fn();
			destroyEffect(node);
		};
	}
	node.sources = [];
	node.notify = notifyEffect;
	return node;
}

export function effect(fn, options = {}) {
	const node = createEffect(fn, options);
	updateNode(node);
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


// todo: add subscribe and untrack tests
export function subscribe(getters, fn, options = {}) {
	let node;
	const defer = options.defer;
	if (Array.isArray(getters)) {
		node = createEffect(function() {
			const length = getters.length;
			const values = Array(length);
			for (let i = 0; i < length; i++) {
				values[i] = getters[i]();
			}
			Listener = null; // untrack
			if (!defer) {
				fn.apply(null, values);
			}
			node.needUpdate = false;
		}, options);
	} else {
		node = createEffect(function() {
			const value = getters();
			Listener = null; // untrack
			if (!defer) {
				fn(value);
			}
			node.needUpdate = false;
		}, options);
	}
	updateNode(node);
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

function notifyMemo() {
	if (this.needUpdate) {
		return;
	}
	this.needUpdate = true;
	cleanupNode(this);
	notifyNode(this);
}

export function memo(fn, name = null) {
	const node = createNode(null, fn, name);
	node.observers = [];
	node.sources = [];
	node.notify = notifyMemo;
	node.needUpdate = true;
	return readMemo.bind(node);
}
