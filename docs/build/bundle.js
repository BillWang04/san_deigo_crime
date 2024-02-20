
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function (d3) {
    'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var d3__namespace = /*#__PURE__*/_interopNamespaceDefault(d3);

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.58.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.58.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (144:1) {#if !isHidden}
    function create_if_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "There is No Data For This Time Period";
    			attr_dev(div, "id", "hidden");
    			add_location(div, file, 144, 2, 3596);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(144:1) {#if !isHidden}",
    		ctx
    	});

    	return block;
    }

    // (155:4) {#each Object.keys(crimeColors) as crimeCategory}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*crimeCategory*/ ctx[20] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*crimeCategory*/ ctx[20];
    			option.value = option.__value;
    			add_location(option, file, 155, 3, 3814);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(155:4) {#each Object.keys(crimeColors) as crimeCategory}",
    		ctx
    	});

    	return block;
    }

    // (164:4) {#each Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')) as month}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*month*/ ctx[17] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*month*/ ctx[17];
    			option.value = option.__value;
    			add_location(option, file, 164, 3, 4064);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(164:4) {#each Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')) as month}",
    		ctx
    	});

    	return block;
    }

    // (173:4) {#each Array.from({ length: 2 }, (_, i) => (2024 - i).toString()) as year}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*year*/ ctx[14] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*year*/ ctx[14];
    			option.value = option.__value;
    			add_location(option, file, 173, 3, 4280);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(173:4) {#each Array.from({ length: 2 }, (_, i) => (2024 - i).toString()) as year}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let t0;
    	let div0;
    	let label0;
    	let t1;
    	let select0;
    	let t2;
    	let label1;
    	let t3;
    	let select1;
    	let t4;
    	let label2;
    	let t5;
    	let select2;
    	let t6;
    	let div1;
    	let h2;
    	let t8;
    	let p0;
    	let t10;
    	let p1;
    	let mounted;
    	let dispose;
    	let if_block = !/*isHidden*/ ctx[0] && create_if_block(ctx);
    	let each_value_2 = Object.keys(/*crimeColors*/ ctx[4]);
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = Array.from({ length: 12 }, func);
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = Array.from({ length: 2 }, func_1);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			label0 = element("label");
    			t1 = text("Crime:\n\t\t");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t2 = space();
    			label1 = element("label");
    			t3 = text("Month:\n\t\t");
    			select1 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t4 = space();
    			label2 = element("label");
    			t5 = text("Year:\n\t\t");
    			select2 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t6 = space();
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Write Up";
    			t8 = space();
    			p0 = element("p");
    			p0.textContent = "- A rationale for your design decisions. How did you choose your particular visual encodings and interaction techniques? What alternatives did you consider and how did you arrive at your ultimate choices?";
    			t10 = space();
    			p1 = element("p");
    			p1.textContent = "- An overview of your development process. Describe how the work was split among the team members. Include a commentary on the development process, including answers to the following questions: Roughly how much time did you spend developing your application (in people-hours)? What aspects took the most time?";
    			if (/*selectedCrime*/ ctx[1] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[5].call(select0));
    			add_location(select0, file, 153, 2, 3721);
    			add_location(label0, file, 151, 3, 3702);
    			if (/*selectedMonth*/ ctx[2] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[6].call(select1));
    			add_location(select1, file, 162, 2, 3930);
    			add_location(label1, file, 160, 3, 3911);
    			if (/*selectedYear*/ ctx[3] === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[7].call(select2));
    			add_location(select2, file, 171, 2, 4163);
    			add_location(label2, file, 169, 3, 4145);
    			attr_dev(div0, "id", "ui-elements");
    			add_location(div0, file, 149, 1, 3675);
    			add_location(h2, file, 180, 2, 4387);
    			add_location(p0, file, 181, 2, 4407);
    			add_location(p1, file, 184, 2, 4628);
    			attr_dev(div1, "id", "writeup");
    			add_location(div1, file, 179, 1, 4363);
    			add_location(main, file, 141, 2, 3539);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if (if_block) if_block.m(main, null);
    			append_dev(main, t0);
    			append_dev(main, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t1);
    			append_dev(label0, select0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select0, null);
    				}
    			}

    			select_option(select0, /*selectedCrime*/ ctx[1], true);
    			append_dev(div0, t2);
    			append_dev(div0, label1);
    			append_dev(label1, t3);
    			append_dev(label1, select1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*selectedMonth*/ ctx[2], true);
    			append_dev(div0, t4);
    			append_dev(div0, label2);
    			append_dev(label2, t5);
    			append_dev(label2, select2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select2, null);
    				}
    			}

    			select_option(select2, /*selectedYear*/ ctx[3], true);
    			append_dev(main, t6);
    			append_dev(main, div1);
    			append_dev(div1, h2);
    			append_dev(div1, t8);
    			append_dev(div1, p0);
    			append_dev(div1, t10);
    			append_dev(div1, p1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[5]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[6]),
    					listen_dev(select2, "change", /*select2_change_handler*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*isHidden*/ ctx[0]) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(main, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*Object, crimeColors*/ 16) {
    				each_value_2 = Object.keys(/*crimeColors*/ ctx[4]);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*selectedCrime, Object, crimeColors*/ 18) {
    				select_option(select0, /*selectedCrime*/ ctx[1]);
    			}

    			if (dirty & /*Array*/ 0) {
    				each_value_1 = Array.from({ length: 12 }, func);
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*selectedMonth, Array*/ 4) {
    				select_option(select1, /*selectedMonth*/ ctx[2]);
    			}

    			if (dirty & /*Array*/ 0) {
    				each_value = Array.from({ length: 2 }, func_1);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*selectedYear, Array*/ 8) {
    				select_option(select2, /*selectedYear*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = (_, i) => (i + 1).toString().padStart(2, '0');
    const func_1 = (_, i) => (2024 - i).toString();

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let lng, lat, zoom;
    	lng = -117.1611;
    	lat = 32.7157;
    	zoom = 9;
    	let isHidden = true;
    	let selectedCrime = "ASSAULT";
    	let selectedMonth = "02";
    	let selectedYear = "2024";
    	let csvData;

    	// Colors of categories
    	const crimeColors = {
    		"THEFT/LARCENY": "#3498db", // Blue
    		"DUI": "#e74c3c", // Red
    		"ROBBERY": "#e67e22", // Orange
    		"BURGLARY": "#9b59b6", // Purple
    		"VANDALISM": "#2ecc71", // Green
    		"FRAUD": "#f1c40f", // Yellow
    		"ASSAULT": "#e91e63", // Pink
    		"VEHICLE BREAK-IN/THEFT": "#00bcd4", // Cyan
    		"DRUGS/ALCOHOL VIOLATIONS": "#d35400", // Brown
    		"ARSON": "#1abc9c", // Teal
    		"MOTOR VEHICLE THEFT": "#303f9f", // Indigo
    		"SEX CRIMES": "#800000", // Maroon
    		"WEAPONS": "#95a5a6", // Gray
    		"HOMICIDE": "#000000", // Black
    		
    	};

    	async function fetchData() {
    		try {
    			let csv_data = await d3__namespace.csv('/data/ARJIS_Public_Crime_Data_w__Day_of_Week_20240215.csv');

    			return csv_data.filter(row => {
    				return row.geometry && row.geometry.match(/POINT \((-?\d+\.\d+) (-?\d+\.\d+)\)/);
    			}).map(row => {
    				const matches = row.geometry.match(/POINT \(([-0-9.]+) ([-0-9.]+)\)/);

    				if (matches && matches.length === 3) {
    					const [_, longitude, latitude] = matches;
    					row.coordinates = [parseFloat(longitude), parseFloat(latitude)];
    				}

    				return row;
    			});
    		} catch(error) {
    			console.error('Error loading CSV:', error);
    		}
    	}

    	async function updatemap() {
    		mapboxgl.accessToken = "pk.eyJ1IjoiYmx3MDAyIiwiYSI6ImNsc21kam9xcTBtaHQycXBkNGVudTZmNXAifQ.Zxv8Wui2RBVxFDRB0mbvMw";

    		const map = new mapboxgl.Map({
    				container: "map",
    				style: "mapbox://styles/mapbox/streets-v12",
    				center: [lng, lat],
    				zoom, // starting zoom level
    				minZoom: 8,
    				maxZoom: 20
    			});

    		const filteredData = csvData.filter(point => {
    			const crimeDate = new Date(point.Date);
    			const crimeMonth = crimeDate.getMonth() + 1; // Months are zero-indexed
    			const crimeYear = crimeDate.getFullYear().toString();
    			return point.Crime_Category === selectedCrime && crimeMonth.toString().padStart(2, '0') === selectedMonth && crimeYear === selectedYear;
    		});

    		if (Number(selectedYear) === 2023 & Number(selectedMonth) < 8) {
    			$$invalidate(0, isHidden = false);
    		} else if (Number(selectedYear) === 2024 & Number(selectedMonth) > 2) {
    			$$invalidate(0, isHidden = false);
    		} else {
    			$$invalidate(0, isHidden = true);
    		}

    		console.log(isHidden);
    		console.log(selectedYear);
    		console.log(selectedMonth);

    		filteredData.forEach(point => {
    			new mapboxgl.Marker({
    					color: crimeColors[point.Crime_Category] || 'gray'
    				}).setLngLat(point.coordinates).setPopup(new mapboxgl.Popup().setHTML(`
			<h3>${point.Agency}</h3>
			<p><strong>Type:</strong> ${point.Crime_Category}</p>
			<p><strong>Date:</strong> ${point.Date}</p>
			<p><strong>Description:</strong> ${point.Charge_Description}</p>
			`)).addTo(map);
    		});

    		map.on('click', e => {
    			console.log('Map clicked at:', e.lngLat);
    		});
    	}

    	// Use await within an async context
    	onMount(async () => {
    		// Assign the result of fetchData to csvData
    		// Initial data load
    		try {
    			csvData = await fetchData();
    			updatemap();
    		} catch(error) {
    			console.error('Error loading CSV data:', error);
    		}
    	});

    	afterUpdate(() => {
    		updatemap();
    	});

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function select0_change_handler() {
    		selectedCrime = select_value(this);
    		$$invalidate(1, selectedCrime);
    		$$invalidate(4, crimeColors);
    	}

    	function select1_change_handler() {
    		selectedMonth = select_value(this);
    		$$invalidate(2, selectedMonth);
    	}

    	function select2_change_handler() {
    		selectedYear = select_value(this);
    		$$invalidate(3, selectedYear);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		d3: d3__namespace,
    		lng,
    		lat,
    		zoom,
    		isHidden,
    		selectedCrime,
    		selectedMonth,
    		selectedYear,
    		csvData,
    		crimeColors,
    		fetchData,
    		updatemap
    	});

    	$$self.$inject_state = $$props => {
    		if ('lng' in $$props) lng = $$props.lng;
    		if ('lat' in $$props) lat = $$props.lat;
    		if ('zoom' in $$props) zoom = $$props.zoom;
    		if ('isHidden' in $$props) $$invalidate(0, isHidden = $$props.isHidden);
    		if ('selectedCrime' in $$props) $$invalidate(1, selectedCrime = $$props.selectedCrime);
    		if ('selectedMonth' in $$props) $$invalidate(2, selectedMonth = $$props.selectedMonth);
    		if ('selectedYear' in $$props) $$invalidate(3, selectedYear = $$props.selectedYear);
    		if ('csvData' in $$props) csvData = $$props.csvData;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		isHidden,
    		selectedCrime,
    		selectedMonth,
    		selectedYear,
    		crimeColors,
    		select0_change_handler,
    		select1_change_handler,
    		select2_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})(d3);
//# sourceMappingURL=bundle.js.map
