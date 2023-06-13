let Listener = null;

function updateNode(node) {
	const prev = Listener;
	Listener = node;
	let newVal;
	try {
		newVal = node.fn();
		node.needUpdate = false;
	} finally {
		Listener = prev;
	}
	return newVal;
}


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
		let queue = batchQueue;
		batchQueue = null;
		queue.forEach( function(node) {
			updateNode(node);
		});
	}
}


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
		const observers = Array.from(this.observers);
		observers.forEach(obs => {
			obs.notify();
		});
	}
}

function cleanupNode(node) {
	for (let i = 0; i < node.sources.length; i++) {
		let source = node.sources[i];
		let sSlot = node.sourceSlots[i];
		let obs = source.observers.pop();
		let obsSlot = source.observerSlots.pop();
		if (sSlot < source.observers.length) {
			source.observers[sSlot] = obs;
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
		sourceSlots: undefined
	};
}

export function ref(initial, name) {
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
	cleanupNode(this);
	if (batchQueue) {
		batchQueue.push(this);
	} else {
		updateNode(this);
	}
}

function destroyEffect() {
	cleanupNode(this);
}

export function effect(fn, name) {
	const node = createNode(undefined, fn, name || null);
	node.sources = [];
	node.sourceSlots = [];
	node.notify = notifyEffect;
	updateNode(node);
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
	const observers = Array.from(this.observers);
	observers.forEach(obs => {
		obs.notify();
	});
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