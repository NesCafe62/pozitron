import { subscribe } from 'pozitron-js';

export function render(app, el) {
	el.replaceWith(app());
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
		el.setAttribute(prop, value);
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
		if (!el) {
			el = render();
		}
		return el;
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