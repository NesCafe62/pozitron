import { expect, it } from 'vitest';
import { signal, memo, effect } from '../src/reactive';

it('memo get value (a,b)->c test', () => {
	let [a, setA] = signal(1);
	let [b, setB] = signal(2);
	let c = memo(() => a() + b());
	expect(c()).toBe(3);
});

it('signal notify dependencies only if value changed test', () => {
	let calls = 0;
	let [a, setA] = signal(1);
	let b = memo(() => {
		calls++;
		return a() + 100;
	});
	b(); // evaluate b
	expect(calls).toBe(1);

	setA(1);
	expect(calls).toBe(1);
});

it('memo return cached value if dependencies not changed (a,b)->c test', () => {
	let calls = 0;
	let [a, setA] = signal(1);
	let [b, setB] = signal(2);
	let c = memo(() => {
		calls++;
		return a() + b();
	});
	expect(c()).toBe(3);
	expect(calls).toBe(1);

	expect(c()).toBe(3);
	expect(calls).toBe(1);
});

it('memo return cached value if dependencies not changed a->b->c test', () => {
	let callsB = 0, callsC = 0;
	let [a, setA] = signal(1);
	let b = memo(() => {
		callsB++;
		return a() + 100;
	});
	let c = memo(() => {
		callsC++;
		return b() + 100;
	});
	expect(b()).toBe(101);
	expect(callsB).toBe(1);
	expect(callsC).toBe(0);

	expect(c()).toBe(201);
	expect(callsB).toBe(1);
	expect(callsC).toBe(1);
});

it('memo update a->b->c test', () => {
	let [a, setA] = signal(1);
	let b = memo(() => a() + 100);
	let c = memo(() => b() + 100);
	expect(b()).toBe(101);
	expect(c()).toBe(201);

	setA(2);
	expect(b()).toBe(102);
	expect(c()).toBe(202);

	setA(3);
	expect(b()).toBe(103);
	expect(c()).toBe(203);
});

it('memo update2 (a,b)->c test', () => {
	let [a, setA] = signal(1);
	let [b, setB] = signal(2);
	let c = memo(() => a() + b());
	expect(c()).toBe(3);

	setA(2);
	expect(c()).toBe(4);

	setB(3);
	expect(c()).toBe(5);
});

it('memo update3 (a,b)->c (b update before a) test', () => {
	let [a, setA] = signal(1);
	let [b, setB] = signal(2);
	let c = memo(() => a() + b());
	expect(c()).toBe(3);

	setB(3);
	expect(c()).toBe(4);

	setA(2);
	expect(c()).toBe(5);
});

it('memo lazyness (a,b)->c test', () => {
	let calls = 0;
	let [a, setA] = signal(1);
	let [b, setB] = signal(2);
	let c = memo(() => {
		calls++;
		return a() + b();
	});
	setA(2);
	setB(3);
	expect(calls).toBe(0);

	c(); // evaludate c
	expect(calls).toBe(1);
	expect(c()).toBe(5);
});

it('memo lazyness2 a->b->c test', () => {
	let callsB = 0, callsC = 0;
	let [a, setA] = signal(1);
	let b = memo(() => {
		callsB++;
		return a() + 100;
	});
	let c = memo(() => {
		callsC++;
		return b() + 100;
	});
	setA(2);
	expect(callsB).toBe(0);
	expect(callsC).toBe(0);

	c(); // evaludate c
	expect(callsB).toBe(1);
	expect(callsC).toBe(1);
});

it('memo lazyness3 a->b->c (access b before c) test', () => {
	let callsB = 0, callsC = 0;
	let [a, setA] = signal(1);
	let b = memo(() => {
		callsB++;
		return a() + 100;
	});
	let c = memo(() => {
		callsC++;
		return b() + 100;
	});
	setA(2);
	expect(callsB).toBe(0);
	expect(callsC).toBe(0);

	b(); // evaludate b
	expect(callsB).toBe(1);
	expect(callsC).toBe(0);

	c(); // evaludate c
	expect(callsB).toBe(1);
	expect(callsC).toBe(1);
});

it('effect test', () => {
	let calls = 0;
	let [a, setA] = signal(1);
	effect(() => {
		calls++;
		a();
	});
	expect(calls).toBe(1);

	setA(2);
	expect(calls).toBe(2);

	setA(3);
	expect(calls).toBe(3);
});

it('diamond dependencies a->(b,c)->d test', () => {
	let calls = 0;
	let [a, setA] = signal(1);
	let b = memo(() => {
		return a() + 1;
	});
	let c = memo(() => {
		return b() + 2;
	});
	effect(() => {
		calls++;
		c();
		b();
	});
	expect(calls).toBe(1);

	setA(2);
	expect(calls).toBe(2);
});

it('double memo derive from same signal a->(b,c) test', () => {
	const [a, setA] = signal(0);

	const b = memo(() => a());
	const c = memo(() => a() * 10);

	expect(b()).toBe(0);
	expect(c()).toBe(0);

	setA(1);
	expect(b()).toBe(1);
	expect(c()).toBe(10);

	setA(2);
	expect(b()).toBe(2);
	expect(c()).toBe(20);
});