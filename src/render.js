import { subscribe } from 'pozitron-js';

export function render(app, el, props = undefined) {
	el.replaceWith(app(props));
}

export function h(type, props = null, children = null) {
	if (typeof type === 'function') {
		const componentProps = children
			? Object.assign({children: children}, props || {})
			: props;
		return type(componentProps);
	}
	const el = (type === '')
		? document.createDocumentFragment()
		: document.createElement(type);
	for (let prop in props) {
		const value = props[prop];
        if (prop === 'on') {
            for (let eventType in value) {
                el.addEventListener(eventType, value[eventType]);
            }
            continue;
        }
		if (prop === 'ref') {
			value(el);
			continue;
		}
		if (prop === 'style') {
			$bindStyle(el, value);
			continue;
		}
		if (prop === 'classList') {
			$bindClassList(el, value);
			continue;
		}
		(typeof value === 'function')
			? $bindAttr(el, prop, value)
			: el.setAttribute(prop, value);
	}
	if (children) {
		const length = children.length;
		for (let i = 0; i < length; i++) {
			let child = children[i];
			if (typeof child === 'function') {
				const getter = child;
				child = document.createTextNode('');
				$bindText(child, getter);
			} else if (typeof child !== 'object') {
				if (typeof child !== 'string') {
					child = child.toString();
				}
				child = document.createTextNode(child);
			}
			el.appendChild(child);
		}
	}
	return el;
}

export function $fragment(els) {
	return h('', null, els);
}

export function $template(render) {
	let el;
	return function() {
		return (el || (el = render())).cloneNode(true);
	}
}

export function $bindText(el, getter) {
	subscribe(getter, function(value) {
		el.nodeValue = value;
	});
}

export function $bindAttr(el, attrName, getter) {
	subscribe(getter, function(value) {
		el.setAttribute(attrName, value);
	});
}

export function $bindAttrDirect(el, attrName, getter) {
	subscribe(getter, function(value) {
		el[attrName] = value;
	});
}

export function $bindClassList(el, classList) {
	for (const className in classList) {
		const hasClass = classList[className];
		const applyClass = function(hasClass) {
			if (hasClass) {
				el.classList.add(className);
			} else {
				el.classList.remove(className);
			}
		};
		(typeof hasClass === 'function')
			? subscribe(hasClass, applyClass)
			: applyClass(hasClass);
	}
}

export function $bindStyle(el, styles) {
	for (const propName in styles) {
		const value = styles[propName];
		const applyStyle = function(value) {
			el.style[propName] = value;
		};
		(typeof value === 'function')
			? subscribe(value, applyStyle)
			: applyStyle(value);
	}
}