import {describe, it, expect} from 'vitest';
import {domToJson, getDomPath, getChildIndex} from '../scripts/dom_tools.js';

const TAG_FILTER = ['input', 'textarea', 'select', 'option'];
const CLASS_FILTER = ['ql-editor'];

describe('getChildIndex', () => {
    it('returns the position of a child among its siblings', () => {
        const root = document.createElement('div');
        const a = document.createElement('span');
        const b = document.createElement('span');
        const c = document.createElement('span');
        root.append(a, b, c);
        expect(getChildIndex(a)).toBe(0);
        expect(getChildIndex(b)).toBe(1);
        expect(getChildIndex(c)).toBe(2);
    });

    it('returns -1 for a node without a parent', () => {
        expect(getChildIndex(document.createElement('div'))).toBe(-1);
    });
});

describe('getDomPath', () => {
    it('builds a slash path without indices for single children', () => {
        const root = document.createElement('div');
        const input = document.createElement('input');
        root.appendChild(input);
        expect(getDomPath(input)).toBe('/div/input');
    });

    it('appends an index when a parent has multiple children', () => {
        const root = document.createElement('div');
        const a = document.createElement('span');
        const b = document.createElement('span');
        root.append(a, b);
        expect(getDomPath(b)).toBe('/div/span:1');
    });
});

describe('domToJson', () => {
    it('collects filtered tags and text nodes, skipping hidden inputs', () => {
        const root = document.createElement('div');
        root.innerHTML = '<input type="text"><input type="hidden"><p>hello</p>';
        const out = [];

        domToJson(root, TAG_FILTER, CLASS_FILTER, out);

        expect(out).toEqual([
            {tag: 'input', path: '/div/input:0'},
            {tag: 'p', text: 'hello', path: '/div/p:2'}
        ]);
    });

    it('stamps the generated path onto matched DOM nodes', () => {
        const root = document.createElement('div');
        root.innerHTML = '<input type="text">';
        const out = [];

        domToJson(root, TAG_FILTER, CLASS_FILTER, out);

        expect(root.querySelector('input').getAttribute('path')).toBe('/div/input');
    });

    it('matches class-filtered nodes and records the class name', () => {
        const root = document.createElement('div');
        const editor = document.createElement('div');
        editor.className = 'ql-editor custom';
        root.appendChild(editor);
        const out = [];

        domToJson(root, TAG_FILTER, CLASS_FILTER, out);

        expect(out).toEqual([
            {tag: 'div', path: '/div/div', className: 'ql-editor custom'}
        ]);
    });
});
