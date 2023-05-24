# Pozitron
JavaScript lightweight reactivity lib inspired by Vue

## Features
* lazyness - calculate value only when it's accessed (supported by `computed`)
* caching - if none of sources were changed getter return cached value (supported by `computed`)
* autowiring - dependencies are collected again. means the can change. (allows if-s, branching) (supported by `computed`, `effect`)
* transactions - collect (stash) non-lazy updates during function call and update dependencies only once after transaction finished (supported by `effect`, `subscribe`)

## Usage

### Ref(initialValue)
A source of changes propagation. State contains a single value.

Reactive state that can have multiple dependencies (subscribers).

```js
let userName = ref('John');

userName.val = 'Alice'; // calling a setter
console.log(userName.val); // calling a getter
```

When set to same value does not trigger update of dependencies.
```
let x = ref(1);
x.val = 1; // dependencies will not be notified
```

New value is comparted by value (by reference for objects and arrays).
```js
let a = ref({x: 1});
a.val = {x: 1}; // this will trigger dependencies update

let obj = {x: 1};
let b = ref(obj);
b.val = obj; // but this will not
```


### Computed(calcCallback)

`Autowiring`: yes

`Lazy`: yes

```js
let a = ref(1);
let b = ref(2);

let c = computed(() => a.val + b.val);
console.log(c.val); // 3
```


### Effect(callback)
Calls a function when any of sources changed.

Runs function single time when created to collect dependencies.

`Autowiring`: yes

`Lazy`: no
```js
let a = ref(1);
let b = ref(3);
effect(() => {
	console.log(`a = ${a.val}, b = ${b.val}`);
});
// will output: "a = 1, b = 3"

a.val = 2; // will output: "a = 2, b = 3"
b.val = 4; // will output: "a = 2, b = 4"
```


### Subscribe(source, callback)
Calls a function when source changed. More lightweight version of `effect` but for single source.

`Autowiring`: no. use only if result depends on a single reactive source

`Lazy`: no
```js
let a = ref(1);
subscribe(a, (value) => {
	console.log(`a = ${value}`);
});

a.val = 2; // will output: "a = 2"
```


### Transaction(callback)
Calls a function. During the call collecting active (non-lazy) dependencies, instead of update dependencies immediately. After transaction function finishes runs all collected updates.

This allow to avoid unnecessary calculations or multiple runs of effect (subscriber) when multiple sources are changed.
```js
let a = ref(1);
let b = ref(3);
let calls = 0;

let c = computed(() => {
	calls++;
	return a.val + b.val;
});

effect(() => {
	console.log(c.val);
});

transaction(() => {
	a.val = 2;
	b.val = 4;
});
// effect will be called only once at the end of transaction and will output: "6"
console.log(calls); // will output: "1"
```
