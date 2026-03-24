(() => {
  // node_modules/.pnpm/preact@10.27.2/node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var s;
  var a;
  var h;
  var p = {};
  var v = [];
  var y = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var w = Array.isArray;
  function d(n2, l2) {
    for (var u3 in l2) n2[u3] = l2[u3];
    return n2;
  }
  function g(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function _(l2, u3, t2) {
    var i2, r2, o2, e2 = {};
    for (o2 in u3) "key" == o2 ? i2 = u3[o2] : "ref" == o2 ? r2 = u3[o2] : e2[o2] = u3[o2];
    if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
    return m(l2, e2, i2, r2, null);
  }
  function m(n2, t2, i2, r2, o2) {
    var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u : o2, __i: -1, __u: 0 };
    return null == o2 && null != l.vnode && l.vnode(e2), e2;
  }
  function k(n2) {
    return n2.children;
  }
  function x(n2, l2) {
    this.props = n2, this.context = l2;
  }
  function S(n2, l2) {
    if (null == l2) return n2.__ ? S(n2.__, n2.__i + 1) : null;
    for (var u3; l2 < n2.__k.length; l2++) if (null != (u3 = n2.__k[l2]) && null != u3.__e) return u3.__e;
    return "function" == typeof n2.type ? S(n2) : null;
  }
  function C(n2) {
    var l2, u3;
    if (null != (n2 = n2.__) && null != n2.__c) {
      for (n2.__e = n2.__c.base = null, l2 = 0; l2 < n2.__k.length; l2++) if (null != (u3 = n2.__k[l2]) && null != u3.__e) {
        n2.__e = n2.__c.base = u3.__e;
        break;
      }
      return C(n2);
    }
  }
  function M(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !$.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)($);
  }
  function $() {
    for (var n2, u3, t2, r2, o2, f3, c2, s2 = 1; i.length; ) i.length > s2 && i.sort(e), n2 = i.shift(), s2 = i.length, n2.__d && (t2 = void 0, r2 = void 0, o2 = (r2 = (u3 = n2).__v).__e, f3 = [], c2 = [], u3.__P && ((t2 = d({}, r2)).__v = r2.__v + 1, l.vnode && l.vnode(t2), O(u3.__P, t2, r2, u3.__n, u3.__P.namespaceURI, 32 & r2.__u ? [o2] : null, f3, null == o2 ? S(r2) : o2, !!(32 & r2.__u), c2), t2.__v = r2.__v, t2.__.__k[t2.__i] = t2, N(f3, t2, c2), r2.__e = r2.__ = null, t2.__e != o2 && C(t2)));
    $.__r = 0;
  }
  function I(n2, l2, u3, t2, i2, r2, o2, e2, f3, c2, s2) {
    var a2, h2, y2, w2, d2, g2, _2, m2 = t2 && t2.__k || v, b = l2.length;
    for (f3 = P(u3, l2, m2, f3, b), a2 = 0; a2 < b; a2++) null != (y2 = u3.__k[a2]) && (h2 = -1 == y2.__i ? p : m2[y2.__i] || p, y2.__i = a2, g2 = O(n2, y2, h2, i2, r2, o2, e2, f3, c2, s2), w2 = y2.__e, y2.ref && h2.ref != y2.ref && (h2.ref && B(h2.ref, null, y2), s2.push(y2.ref, y2.__c || w2, y2)), null == d2 && null != w2 && (d2 = w2), (_2 = !!(4 & y2.__u)) || h2.__k === y2.__k ? f3 = A(y2, f3, n2, _2) : "function" == typeof y2.type && void 0 !== g2 ? f3 = g2 : w2 && (f3 = w2.nextSibling), y2.__u &= -7);
    return u3.__e = d2, f3;
  }
  function P(n2, l2, u3, t2, i2) {
    var r2, o2, e2, f3, c2, s2 = u3.length, a2 = s2, h2 = 0;
    for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? (f3 = r2 + h2, (o2 = n2.__k[r2] = "string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? m(null, o2, null, null, null) : w(o2) ? m(k, { children: o2 }, null, null, null) : null == o2.constructor && o2.__b > 0 ? m(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : o2).__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = L(o2, u3, f3, a2)) && (a2--, (e2 = u3[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > s2 ? h2-- : i2 < s2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f3 && (c2 == f3 - 1 ? h2-- : c2 == f3 + 1 ? h2++ : (c2 > f3 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
    if (a2) for (r2 = 0; r2 < s2; r2++) null != (e2 = u3[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = S(e2)), D(e2, e2));
    return t2;
  }
  function A(n2, l2, u3, t2) {
    var i2, r2;
    if ("function" == typeof n2.type) {
      for (i2 = n2.__k, r2 = 0; i2 && r2 < i2.length; r2++) i2[r2] && (i2[r2].__ = n2, l2 = A(i2[r2], l2, u3, t2));
      return l2;
    }
    n2.__e != l2 && (t2 && (l2 && n2.type && !l2.parentNode && (l2 = S(n2)), u3.insertBefore(n2.__e, l2 || null)), l2 = n2.__e);
    do {
      l2 = l2 && l2.nextSibling;
    } while (null != l2 && 8 == l2.nodeType);
    return l2;
  }
  function L(n2, l2, u3, t2) {
    var i2, r2, o2, e2 = n2.key, f3 = n2.type, c2 = l2[u3], s2 = null != c2 && 0 == (2 & c2.__u);
    if (null === c2 && null == n2.key || s2 && e2 == c2.key && f3 == c2.type) return u3;
    if (t2 > (s2 ? 1 : 0)) {
      for (i2 = u3 - 1, r2 = u3 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f3 == c2.type) return o2;
    }
    return -1;
  }
  function T(n2, l2, u3) {
    "-" == l2[0] ? n2.setProperty(l2, null == u3 ? "" : u3) : n2[l2] = null == u3 ? "" : "number" != typeof u3 || y.test(l2) ? u3 : u3 + "px";
  }
  function j(n2, l2, u3, t2, i2) {
    var r2, o2;
    n: if ("style" == l2) if ("string" == typeof u3) n2.style.cssText = u3;
    else {
      if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u3 && l2 in u3 || T(n2.style, l2, "");
      if (u3) for (l2 in u3) t2 && u3[l2] == t2[l2] || T(n2.style, l2, u3[l2]);
    }
    else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(f, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u3, u3 ? t2 ? u3.u = t2.u : (u3.u = c, n2.addEventListener(l2, r2 ? a : s, r2)) : n2.removeEventListener(l2, r2 ? a : s, r2);
    else {
      if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
        n2[l2] = null == u3 ? "" : u3;
        break n;
      } catch (n3) {
      }
      "function" == typeof u3 || (null == u3 || false === u3 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u3 ? "" : u3));
    }
  }
  function F(n2) {
    return function(u3) {
      if (this.l) {
        var t2 = this.l[u3.type + n2];
        if (null == u3.t) u3.t = c++;
        else if (u3.t < t2.u) return;
        return t2(l.event ? l.event(u3) : u3);
      }
    };
  }
  function O(n2, u3, t2, i2, r2, o2, e2, f3, c2, s2) {
    var a2, h2, p2, v2, y2, _2, m2, b, S2, C2, M2, $2, P2, A2, H, L2, T2, j2 = u3.type;
    if (null != u3.constructor) return null;
    128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f3 = u3.__e = t2.__e]), (a2 = l.__b) && a2(u3);
    n: if ("function" == typeof j2) try {
      if (b = u3.props, S2 = "prototype" in j2 && j2.prototype.render, C2 = (a2 = j2.contextType) && i2[a2.__c], M2 = a2 ? C2 ? C2.props.value : a2.__ : i2, t2.__c ? m2 = (h2 = u3.__c = t2.__c).__ = h2.__E : (S2 ? u3.__c = h2 = new j2(b, M2) : (u3.__c = h2 = new x(b, M2), h2.constructor = j2, h2.render = E), C2 && C2.sub(h2), h2.props = b, h2.state || (h2.state = {}), h2.context = M2, h2.__n = i2, p2 = h2.__d = true, h2.__h = [], h2._sb = []), S2 && null == h2.__s && (h2.__s = h2.state), S2 && null != j2.getDerivedStateFromProps && (h2.__s == h2.state && (h2.__s = d({}, h2.__s)), d(h2.__s, j2.getDerivedStateFromProps(b, h2.__s))), v2 = h2.props, y2 = h2.state, h2.__v = u3, p2) S2 && null == j2.getDerivedStateFromProps && null != h2.componentWillMount && h2.componentWillMount(), S2 && null != h2.componentDidMount && h2.__h.push(h2.componentDidMount);
      else {
        if (S2 && null == j2.getDerivedStateFromProps && b !== v2 && null != h2.componentWillReceiveProps && h2.componentWillReceiveProps(b, M2), !h2.__e && null != h2.shouldComponentUpdate && false === h2.shouldComponentUpdate(b, h2.__s, M2) || u3.__v == t2.__v) {
          for (u3.__v != t2.__v && (h2.props = b, h2.state = h2.__s, h2.__d = false), u3.__e = t2.__e, u3.__k = t2.__k, u3.__k.some(function(n3) {
            n3 && (n3.__ = u3);
          }), $2 = 0; $2 < h2._sb.length; $2++) h2.__h.push(h2._sb[$2]);
          h2._sb = [], h2.__h.length && e2.push(h2);
          break n;
        }
        null != h2.componentWillUpdate && h2.componentWillUpdate(b, h2.__s, M2), S2 && null != h2.componentDidUpdate && h2.__h.push(function() {
          h2.componentDidUpdate(v2, y2, _2);
        });
      }
      if (h2.context = M2, h2.props = b, h2.__P = n2, h2.__e = false, P2 = l.__r, A2 = 0, S2) {
        for (h2.state = h2.__s, h2.__d = false, P2 && P2(u3), a2 = h2.render(h2.props, h2.state, h2.context), H = 0; H < h2._sb.length; H++) h2.__h.push(h2._sb[H]);
        h2._sb = [];
      } else do {
        h2.__d = false, P2 && P2(u3), a2 = h2.render(h2.props, h2.state, h2.context), h2.state = h2.__s;
      } while (h2.__d && ++A2 < 25);
      h2.state = h2.__s, null != h2.getChildContext && (i2 = d(d({}, i2), h2.getChildContext())), S2 && !p2 && null != h2.getSnapshotBeforeUpdate && (_2 = h2.getSnapshotBeforeUpdate(v2, y2)), L2 = a2, null != a2 && a2.type === k && null == a2.key && (L2 = V(a2.props.children)), f3 = I(n2, w(L2) ? L2 : [L2], u3, t2, i2, r2, o2, e2, f3, c2, s2), h2.base = u3.__e, u3.__u &= -161, h2.__h.length && e2.push(h2), m2 && (h2.__E = h2.__ = null);
    } catch (n3) {
      if (u3.__v = null, c2 || null != o2) if (n3.then) {
        for (u3.__u |= c2 ? 160 : 128; f3 && 8 == f3.nodeType && f3.nextSibling; ) f3 = f3.nextSibling;
        o2[o2.indexOf(f3)] = null, u3.__e = f3;
      } else {
        for (T2 = o2.length; T2--; ) g(o2[T2]);
        z(u3);
      }
      else u3.__e = t2.__e, u3.__k = t2.__k, n3.then || z(u3);
      l.__e(n3, u3, t2);
    }
    else null == o2 && u3.__v == t2.__v ? (u3.__k = t2.__k, u3.__e = t2.__e) : f3 = u3.__e = q(t2.__e, u3, t2, i2, r2, o2, e2, c2, s2);
    return (a2 = l.diffed) && a2(u3), 128 & u3.__u ? void 0 : f3;
  }
  function z(n2) {
    n2 && n2.__c && (n2.__c.__e = true), n2 && n2.__k && n2.__k.forEach(z);
  }
  function N(n2, u3, t2) {
    for (var i2 = 0; i2 < t2.length; i2++) B(t2[i2], t2[++i2], t2[++i2]);
    l.__c && l.__c(u3, n2), n2.some(function(u4) {
      try {
        n2 = u4.__h, u4.__h = [], n2.some(function(n3) {
          n3.call(u4);
        });
      } catch (n3) {
        l.__e(n3, u4.__v);
      }
    });
  }
  function V(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b && n2.__b > 0 ? n2 : w(n2) ? n2.map(V) : d({}, n2);
  }
  function q(u3, t2, i2, r2, o2, e2, f3, c2, s2) {
    var a2, h2, v2, y2, d2, _2, m2, b = i2.props, k2 = t2.props, x2 = t2.type;
    if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
      for (a2 = 0; a2 < e2.length; a2++) if ((d2 = e2[a2]) && "setAttribute" in d2 == !!x2 && (x2 ? d2.localName == x2 : 3 == d2.nodeType)) {
        u3 = d2, e2[a2] = null;
        break;
      }
    }
    if (null == u3) {
      if (null == x2) return document.createTextNode(k2);
      u3 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l.__m && l.__m(t2, e2), c2 = false), e2 = null;
    }
    if (null == x2) b === k2 || c2 && u3.data == k2 || (u3.data = k2);
    else {
      if (e2 = e2 && n.call(u3.childNodes), b = i2.props || p, !c2 && null != e2) for (b = {}, a2 = 0; a2 < u3.attributes.length; a2++) b[(d2 = u3.attributes[a2]).name] = d2.value;
      for (a2 in b) if (d2 = b[a2], "children" == a2) ;
      else if ("dangerouslySetInnerHTML" == a2) v2 = d2;
      else if (!(a2 in k2)) {
        if ("value" == a2 && "defaultValue" in k2 || "checked" == a2 && "defaultChecked" in k2) continue;
        j(u3, a2, null, d2, o2);
      }
      for (a2 in k2) d2 = k2[a2], "children" == a2 ? y2 = d2 : "dangerouslySetInnerHTML" == a2 ? h2 = d2 : "value" == a2 ? _2 = d2 : "checked" == a2 ? m2 = d2 : c2 && "function" != typeof d2 || b[a2] === d2 || j(u3, a2, d2, b[a2], o2);
      if (h2) c2 || v2 && (h2.__html == v2.__html || h2.__html == u3.innerHTML) || (u3.innerHTML = h2.__html), t2.__k = [];
      else if (v2 && (u3.innerHTML = ""), I("template" == t2.type ? u3.content : u3, w(y2) ? y2 : [y2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f3, e2 ? e2[0] : i2.__k && S(i2, 0), c2, s2), null != e2) for (a2 = e2.length; a2--; ) g(e2[a2]);
      c2 || (a2 = "value", "progress" == x2 && null == _2 ? u3.removeAttribute("value") : null != _2 && (_2 !== u3[a2] || "progress" == x2 && !_2 || "option" == x2 && _2 != b[a2]) && j(u3, a2, _2, b[a2], o2), a2 = "checked", null != m2 && m2 != u3[a2] && j(u3, a2, m2, b[a2], o2));
    }
    return u3;
  }
  function B(n2, u3, t2) {
    try {
      if ("function" == typeof n2) {
        var i2 = "function" == typeof n2.__u;
        i2 && n2.__u(), i2 && null == u3 || (n2.__u = n2(u3));
      } else n2.current = u3;
    } catch (n3) {
      l.__e(n3, t2);
    }
  }
  function D(n2, u3, t2) {
    var i2, r2;
    if (l.unmount && l.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || B(i2, null, u3)), null != (i2 = n2.__c)) {
      if (i2.componentWillUnmount) try {
        i2.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u3);
      }
      i2.base = i2.__P = null;
    }
    if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && D(i2[r2], u3, t2 || "function" != typeof n2.type);
    t2 || g(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function E(n2, l2, u3) {
    return this.constructor(n2, u3);
  }
  function G(u3, t2, i2) {
    var r2, o2, e2, f3;
    t2 == document && (t2 = document.documentElement), l.__ && l.__(u3, t2), o2 = (r2 = "function" == typeof i2) ? null : i2 && i2.__k || t2.__k, e2 = [], f3 = [], O(t2, u3 = (!r2 && i2 || t2).__k = _(k, null, [u3]), o2 || p, p, t2.namespaceURI, !r2 && i2 ? [i2] : o2 ? null : t2.firstChild ? n.call(t2.childNodes) : null, e2, !r2 && i2 ? i2 : o2 ? o2.__e : t2.firstChild, r2, f3), N(e2, u3, f3);
  }
  n = v.slice, l = { __e: function(n2, l2, u3, t2) {
    for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
      if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
    } catch (l3) {
      n2 = l3;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && null == n2.constructor;
  }, x.prototype.setState = function(n2, l2) {
    var u3;
    u3 = null != this.__s && this.__s != this.state ? this.__s : this.__s = d({}, this.state), "function" == typeof n2 && (n2 = n2(d({}, u3), this.props)), n2 && d(u3, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), M(this));
  }, x.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), M(this));
  }, x.prototype.render = k, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l2) {
    return n2.__v.__b - l2.__v.__b;
  }, $.__r = 0, f = /(PointerCapture)$|Capture$/i, c = 0, s = F(false), a = F(true), h = 0;

  // node_modules/.pnpm/preact@10.27.2/node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f2 = 0;
  function u2(e2, t2, n2, o2, i2, u3) {
    t2 || (t2 = {});
    var a2, c2, p2 = t2;
    if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
    var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
    if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
    return l.vnode && l.vnode(l2), l2;
  }

  // ns-hugo-imp:/Users/tastelikefeet/Library/Caches/hugo_cache/modules/filecache/modules/pkg/mod/github.com/!hugo!blox/kit/modules/blox@v0.0.0-20260124040029-77f7678f08ac/blox/shared/js/components/Icon.jsx
  var Icon = ({ svg, attributes }) => {
    if (!svg) return null;
    let decoded = String(svg).replace(/\\u003c/gi, "<").replace(/\\u003e/gi, ">").replace(/\\u0026/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#34;/gi, '"').replace(/&amp;/gi, "&");
    const hasWrapper = /<svg[\s>]/i.test(decoded);
    if (hasWrapper) {
      if (/<svg[^>]*class=/i.test(decoded)) {
        decoded = decoded.replace(/<svg([^>]*?)class="([^"]*)"([^>]*)>/i, '<svg$1class="$2 inline-block w-4 h-4"$3>');
      } else {
        decoded = decoded.replace(/<svg\b/i, '<svg class="inline-block w-4 h-4"');
      }
      return /* @__PURE__ */ u2("span", { class: "inline-block", dangerouslySetInnerHTML: { __html: decoded } });
    }
    const finalAttributes = {
      class: "inline-block w-4 h-4",
      fill: "currentColor",
      viewBox: "0 0 20 20",
      ...attributes || {}
    };
    const attrs = Object.entries(finalAttributes).map(([k2, v2]) => `${k2}="${String(v2)}"`).join(" ");
    return /* @__PURE__ */ u2("span", { class: "inline-block", dangerouslySetInnerHTML: { __html: `<svg ${attrs}>${decoded}</svg>` } });
  };

  // ns-hugo-imp:/Users/tastelikefeet/Library/Caches/hugo_cache/modules/filecache/modules/pkg/mod/github.com/!hugo!blox/kit/modules/blox@v0.0.0-20260124040029-77f7678f08ac/blox/hero/component.jsx
  function renderText(text) {
    if (!text) return "";
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>").replace(/`(.*?)`/g, "<code>$1</code>");
  }
  function processUrl(url) {
    if (!url) return { href: "#" };
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return {
        href: url,
        target: "_blank",
        rel: "noopener"
      };
    }
    if (url.startsWith("#")) {
      return { href: url };
    }
    return { href: url };
  }
  var HeroBlock = ({ content, design, id, icon_svg }) => {
    const paddingClasses = design?.no_padding ? "" : "py-32 sm:py-48 lg:py-56";
    return /* @__PURE__ */ u2("div", { class: "relative isolate px-6 pt-14 lg:px-8", id, children: /* @__PURE__ */ u2("div", { class: `mx-auto max-w-2xl ${paddingClasses}`, children: [
      content.announcement?.text && /* @__PURE__ */ u2("div", { class: "hidden sm:mb-8 sm:flex sm:justify-center", children: /* @__PURE__ */ u2("div", { class: "relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 dark:text-gray-300 ring-1 ring-gray-900/10 dark:ring-gray-300 hover:ring-gray-900/20 dark:hover:ring-gray-400", children: [
        /* @__PURE__ */ u2(
          "span",
          {
            dangerouslySetInnerHTML: {
              __html: renderText(content.announcement.text)
            }
          }
        ),
        content.announcement.link?.text && /* @__PURE__ */ u2(
          "a",
          {
            href: processUrl(content.announcement.link.url).href,
            ...processUrl(content.announcement.link.url).target && {
              target: processUrl(content.announcement.link.url).target,
              rel: processUrl(content.announcement.link.url).rel
            },
            class: "pl-2 font-semibold text-primary-600 dark:text-primary-300",
            children: [
              /* @__PURE__ */ u2("span", { class: "absolute inset-0", "aria-hidden": "true" }),
              content.announcement.link.text,
              " ",
              /* @__PURE__ */ u2("span", { "aria-hidden": "true", children: "\u2192" })
            ]
          }
        )
      ] }) }),
      /* @__PURE__ */ u2("div", { class: "text-center", children: [
        content.title && /* @__PURE__ */ u2(
          "h1",
          {
            class: "text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-6xl",
            dangerouslySetInnerHTML: { __html: renderText(content.title) }
          }
        ),
        content.text && /* @__PURE__ */ u2(
          "p",
          {
            class: "mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto",
            dangerouslySetInnerHTML: { __html: renderText(content.text) }
          }
        ),
        (content.primary_action?.url || content.secondary_action?.url) && /* @__PURE__ */ u2("div", { class: "mt-10 flex items-center justify-center gap-x-6", children: [
          content.primary_action?.url && /* @__PURE__ */ u2(
            "a",
            {
              href: processUrl(content.primary_action.url).href,
              ...processUrl(content.primary_action.url).target && {
                target: processUrl(content.primary_action.url).target,
                rel: processUrl(content.primary_action.url).rel
              },
              class: "rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
              children: [
                /* @__PURE__ */ u2(
                  "span",
                  {
                    dangerouslySetInnerHTML: {
                      __html: renderText(content.primary_action.text)
                    }
                  }
                ),
                content.primary_action.icon && /* @__PURE__ */ u2("span", { class: "inline-block pl-2", children: /* @__PURE__ */ u2(Icon, { svg: icon_svg }) })
              ]
            }
          ),
          content.secondary_action?.url && /* @__PURE__ */ u2(
            "a",
            {
              href: processUrl(content.secondary_action.url).href,
              ...processUrl(content.secondary_action.url).target && {
                target: processUrl(content.secondary_action.url).target,
                rel: processUrl(content.secondary_action.url).rel
              },
              class: "text-sm font-semibold leading-6 text-gray-900 dark:text-gray-100 hover:dark:text-gray-200 hover:text-gray-800",
              children: [
                /* @__PURE__ */ u2(
                  "span",
                  {
                    dangerouslySetInnerHTML: {
                      __html: renderText(content.secondary_action.text)
                    }
                  }
                ),
                /* @__PURE__ */ u2("span", { "aria-hidden": "true", children: " \u2192" })
              ]
            }
          )
        ] })
      ] })
    ] }) });
  };

  // <stdin>
  function renderHeroBlocks() {
    const heroBlocks = document.querySelectorAll('[data-block-type="hero"], [data-hero-render="immediate"]');
    heroBlocks.forEach((block) => {
      const propsData = block.dataset.props;
      if (propsData) {
        try {
          const props = JSON.parse(propsData);
          G(/* @__PURE__ */ u2(HeroBlock, { ...props }), block);
          console.debug(`\u2713 Hero block "${block.id}" rendered with Preact`);
        } catch (error) {
          console.error(`Failed to render Hero block "${block.id}":`, error);
        }
      }
    });
    if (heroBlocks.length > 0) {
      console.debug(`\u2713 ${heroBlocks.length} Hero blocks initialized with Preact`);
    }
  }
  renderHeroBlocks();
})();
