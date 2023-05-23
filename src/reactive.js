
let transactionQueue = null;
let transactionLevel = 0;

export function transaction(func) {
	if (transactionLevel === 0) {
		transactionQueue = [];
	}
	transactionLevel++;
	func(); // todo: try finally
	transactionLevel--;
	if (transactionLevel === 0) {
		let queue = transactionQueue;
		transactionQueue = null;
		queue.forEach( function(dep) {
			dep();
		});
	}
}



let activeDep = null;

export function ref(val) {
	const raw = { val: val };
	const deps = new Set();
	return Object.create(Object.prototype, {
		$raw: { value: raw },
		$deps: { value: deps },
		val: {
			get: function() {
				if (activeDep) {
					deps.add(activeDep);
				}
				return raw.val;
			},
			set: function(newValue) {
				if (newValue !== raw.val) {
					raw.val = newValue;
					deps.forEach(function(d) {
						d();
					});
				}
			}
		}
	});
}

export function effect(func) {
	let needUpdate = false;
	function update() {
		activeDep = dep;
		func();
		activeDep = null;
		needUpdate = false;
	}
	function dep() {
		if (needUpdate) {
			return;
		}
		needUpdate = true;
		if (transactionQueue) {
			transactionQueue.push(update);
		} else {
			update();
		}
	}
	dep();
}

export function subscribe(r, func) {
	let needUpdate = false;
	func(r.val);
	function update() {
		func(r.val);
		needUpdate = false;
	}
	r.$deps.add( function() {
		if (needUpdate) {
			return;
		}
		needUpdate = true;
		if (transactionQueue) {
			transactionQueue.push(update);
		} else {
			update();
		}
	});
}

// let activeDepName = null;

export function computed(func, name) {
	const raw = { val: null };
	let needUpdate = true;
	const deps = new Set();
	function invalidate() {
		if (needUpdate) {
			return;
		}
		needUpdate = true;
		deps.forEach(function(d) {
			d();
		});
	}
	function update() {
		if (!needUpdate) {
			return;
		}
		// const prevDepName = activeDepName;
		// activeDepName = name;
		const prevDep = activeDep;
		activeDep = invalidate;
		const newValue = func();
		needUpdate = false;
		activeDep = prevDep;
		// activeDepName = prevDepName;
		if (newValue !== raw.val) {
			raw.val = newValue;
			deps.forEach(function(d) {
				d();
			});
		}
	}
	return Object.create(Object.prototype, {
		$raw: { value: raw },
		$deps: { value: deps },
		val: {
			get: function() {
				update();
				if (activeDep) {
					deps.add(activeDep);
				}
				return raw.val;
			},
			set(newValue) {
				console.error('Unable to set computed');
			}
		}
	});
}