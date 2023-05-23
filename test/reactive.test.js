import { ref, computed } from '../src/reactive';

it('computed get value (a,b)->c test', () => {
	let a = ref(1);
	let b = ref(2);
	let c = computed(() => a.val + b.val);
	expect(c.val).toBe(3);
});

it('ref notify dependencies only if value changed test', () => {
	let calls = 0;
	let a = ref(1);
	let b = computed(() => {
		calls++;
		return a.val + 100;
	});
	b.val; // evaluate b
	expect(calls).toBe(1);

	a.val = 1;
	expect(calls).toBe(1);
});

it('computed return cached value if dependencies not changed (a,b)->c test', () => {
	let calls = 0;
	let a = ref(1);
	let b = ref(2);
	let c = computed(() => {
		calls++;
		return a.val + b.val;
	});
	let cVal = c.val;
	expect(cVal).toBe(3);
	expect(calls).toBe(1);

	cVal = c.val;
	expect(cVal).toBe(3);
	expect(calls).toBe(1);
});

it('computed return cached value if dependencies not changed a->b->c test', () => {
	let callsB = 0, callsC = 0;
	let a = ref(1);
	let b = computed(() => {
		callsB++;
		return a.val + 100;
	});
	let c = computed(() => {
		callsC++;
		return b.val + 100;
	});
	let bVal = b.val;
	expect(bVal).toBe(101);
	expect(callsB).toBe(1);
	expect(callsC).toBe(0);

	let cVal = c.val;
	expect(cVal).toBe(201);
	expect(callsB).toBe(1);
	expect(callsC).toBe(1);
});

it('computed update a->b->c test', () => {
	let a = ref(1);
	let b = computed(() => a.val + 100);
	let c = computed(() => b.val + 100);
	expect(b.val).toBe(101);
	expect(c.val).toBe(201);

	a.val = 2;
	expect(b.val).toBe(102);
	expect(c.val).toBe(202);

	a.val = 3;
	expect(b.val).toBe(103);
	expect(c.val).toBe(203);
});

it('computed update2 (a,b)->c test', () => {
	let a = ref(1);
	let b = ref(2);
	let c = computed(() => a.val + b.val);
	expect(c.val).toBe(3);

	a.val = 2;
	expect(c.val).toBe(4);

	b.val = 3;
	expect(c.val).toBe(5);
});

it('computed update3 (a,b)->c (b update before a) test', () => {
	let a = ref(1);
	let b = ref(2);
	let c = computed(() => a.val + b.val);
	expect(c.val).toBe(3);

	b.val = 3;
	expect(c.val).toBe(4);

	a.val = 2;
	expect(c.val).toBe(5);
});

it('computed lazyness (a,b)->c test', () => {
	let calls = 0;
	let a = ref(1);
	let b = ref(2);
	let c = computed(() => {
		calls++;
		return a.val + b.val;
	});
	a.val = 2;
	b.val = 3;
	expect(calls).toBe(0);

	c.val; // evaludate c
	expect(calls).toBe(1);
	expect(c.val).toBe(5);
});

it('computed lazyness2 a->b->c test', () => {
	let callsB = 0, callsC = 0;
	let a = ref(1);
	let b = computed(() => {
		callsB++;
		return a.val + 100;
	});
	let c = computed(() => {
		callsC++;
		return b.val + 100;
	});
	a.val = 2;
	expect(callsB).toBe(0);
	expect(callsC).toBe(0);

	c.val; // evaludate c
	expect(callsB).toBe(1);
	expect(callsC).toBe(1);
});

it('computed lazyness3 a->b->c (access b before c) test', () => {
	let callsB = 0, callsC = 0;
	let a = ref(1);
	let b = computed(() => {
		callsB++;
		return a.val + 100;
	});
	let c = computed(() => {
		callsC++;
		return b.val + 100;
	});
	a.val = 2;
	expect(callsB).toBe(0);
	expect(callsC).toBe(0);

	b.val; // evaludate b
	expect(callsB).toBe(1);
	expect(callsC).toBe(0);

	c.val; // evaludate c
	expect(callsB).toBe(1);
	expect(callsC).toBe(1);
});
