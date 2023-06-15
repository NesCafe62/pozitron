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
		Listener.sources.push(this);
		Listener.sourceSlots.push(this.observers.length);
		this.observers.push(Listener);
		this.observerSlots.push(Listener.sources.length - 1);
	}
	return this.value;
}

function writeNode(newVal) {
	if (newVal !== this.value) {
		this.value = newVal;
		const obs = this.observers;
		const length = obs.length;
		for (let i = 0; i < length; i++) {
			obs[i].notify();
		}
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

function cleanupNode(node) {
	const length = node.sources.length;
	for (let i = 0; i < length; i++) {
		const source = node.sources[i];
		const sSlot = node.sourceSlots[i];
		const sObservers = source.observers;
		const obs = sObservers.pop();
		const obsSlot = source.observerSlots.pop();
		if (sSlot < sObservers.length) {
			sObservers[sSlot] = obs;
			source.observerSlots[sSlot] = obsSlot;
		}
	}
	// clear sources
	node.sources.splice(0);
	node.sourceSlots.splice(0);
}


function createNode(value, fn, name) {
	return {
		name: name,
		fn: fn,
		needUpdate: false,
		value: value,
		notify: undefined,
		observers: undefined,
		observerSlots: undefined,
		sources: undefined,
		sourceSlots: undefined,
		isStatic: false
	};
}

export function signal(initial, name) {
	const node = createNode(initial, undefined, name || null);
	node.observers = [];
	node.observerSlots = [];
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
	cleanupNode(this);
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
	node.sourceSlots = [];
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
export function subscribe(getters, fn, name) {
	const sources = Array.isArray(getters) ? getters : [getters];
	const node = createEffect(function() {
		const length = sources.length;
		const values = Array(length);
		for (let i = 0; i < length; i++) {
			values[i] = sources[i]();
		}
		Listener = null;
		fn.apply(null, values);
		node.needUpdate = false;
	}, options);
	updateNode(node);
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
	const obs = this.observers;
	const length = obs.length;
	for (let i = 0; i < length; i++) {
		obs[i].notify();
	}
}

export function memo(fn, name) {
	const node = createNode(null, fn, name || null);
	node.observers = [];
	node.observerSlots = [];
	node.sources = [];
	node.sourceSlots = [];
	node.notify = notifyMemo;
	node.needUpdate = true;
	return readMemo.bind(node);
}