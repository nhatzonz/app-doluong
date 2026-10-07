// Ban do dung MapLibre GL JS + tile OpenFreeMap trong WebView.
// OpenFreeMap: khong can API key, khong dang ky, khong gioi han luot xem.
// Nho vay Android khong can Google Maps API key (va khong can gan the thanh toan).
// Chay duoc trong Expo Go, va chup duoc anh ban do cho bao cao PDF.
//
// Props (chi hien thi, khong chua logic do dac):
//   lines   [{ color, coords: [{latitude, longitude}] }]  duong to mau theo doan
//   track   [{latitude, longitude}]                        duong xam (khi chua co mau)
//   points  [{ index, lat, lon, color }]                   cham tron cho segment khong co wallTime
//   marks   [{ id, lat, lon, label }]                      ghim danh dau
//   user    { lat, lon }                                   vi tri hien tai
//   region  { latitude, longitude, latitudeDelta, longitudeDelta }
//   follow  bam theo diem moi nhat (man Do luong)
//   onPressLine(lineIndex, { latitude, longitude })
// Ref: snapshot() → base64 PNG (null neu that bai)

import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../../utils/colors';
import { useT } from '../../i18n';

const MAPLIBRE_JS = 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/5.24.0/maplibre-gl.js';
const MAPLIBRE_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/5.24.0/maplibre-gl.css';
export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/bright';
const SNAPSHOT_TIMEOUT_MS = 6000;
// Khong nhan duoc 'ready' trong khoang nay → coi nhu khong tai duoc ban do
const LOAD_TIMEOUT_MS = 9000;

const toLngLat = (c) => [c.longitude ?? c.lon, c.latitude ?? c.lat];

const buildHtml = ({ zoomControl, attributionPosition, bottomInset, topInset }) => `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link href="${MAPLIBRE_CSS}" rel="stylesheet"/>
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#F2F4F8}
  .mark{font-size:22px;line-height:22px}
  .maplibregl-ctrl-attrib{font-size:9px}
  .maplibregl-ctrl-bottom-right,.maplibregl-ctrl-bottom-left{bottom:${bottomInset}px}
  .maplibregl-ctrl-top-right,.maplibregl-ctrl-top-left{top:${topInset}px}
</style></head><body><div id="map"></div>
<script>
  var send = function (msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); };
  var pendingData = null;

  // MapLibre can WebGL. May ao / WebView cu / may yeu co the khong co →
  // chuyen sang ve bang canvas 2D de khong bao gio hien ban do trang.
  var hasWebGL = (function () {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
  })();

  window.__setData = function (json) {
    var d = JSON.parse(json);
    if (window.__apply) window.__apply(d); else pendingData = d;
  };

  function flushPending() { if (pendingData) { window.__apply(pendingData); pendingData = null; } }

  // ---------------- Che do ban do day du (MapLibre + OpenFreeMap) ----------------
  function startMap() {
    var map = new maplibregl.Map({
      container: 'map',
      style: '${OPENFREEMAP_STYLE}',
      center: [107.5909, 16.4637],
      zoom: 13,
      attributionControl: false,
      preserveDrawingBuffer: true   // can thiet de chup anh ban do cho PDF
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), '${attributionPosition}');
    ${zoomControl ? "map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');" : ''}

    var markers = [], ready = false;
    var empty = { type: 'FeatureCollection', features: [] };

    map.on('load', function () {
      ['track', 'lines', 'points', 'user'].forEach(function (id) {
        map.addSource(id, { type: 'geojson', data: empty });
      });
      map.addLayer({ id: 'track', type: 'line', source: 'track',
        paint: { 'line-color': '#9AA1AD', 'line-width': 3 },
        layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'lines', type: 'line', source: 'lines',
        paint: { 'line-color': ['get', 'color'], 'line-width': 6 },
        layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'points', type: 'circle', source: 'points',
        paint: { 'circle-radius': 6, 'circle-color': ['get', 'color'],
                 'circle-stroke-width': 2, 'circle-stroke-color': '#FFFFFF' } });
      map.addLayer({ id: 'user', type: 'circle', source: 'user',
        paint: { 'circle-radius': 7, 'circle-color': '#2E8BFF',
                 'circle-stroke-width': 3, 'circle-stroke-color': '#FFFFFF' } });

      ['lines', 'points'].forEach(function (id) {
        map.on('click', id, function (e) {
          var f = e.features && e.features[0];
          if (!f) return;
          send({ type: 'press', index: f.properties.index,
                 latitude: e.lngLat.lat, longitude: e.lngLat.lng });
        });
      });

      ready = true;
      flushPending();
      send({ type: 'ready', webgl: true });
    });

    map.on('error', function (e) {
      send({ type: 'maperror', message: (e && e.error && e.error.message) || 'unknown' });
    });

    function lineFeatures(lines) {
      return (lines || []).map(function (l, i) {
        return { type: 'Feature', properties: { color: l.color, index: i },
                 geometry: { type: 'LineString', coordinates: l.coords } };
      });
    }
    function pointFeatures(points) {
      return (points || []).map(function (p) {
        return { type: 'Feature', properties: { color: p.color, index: p.index },
                 geometry: { type: 'Point', coordinates: [p.lon, p.lat] } };
      });
    }

    window.__apply = function (d) {
      if (!ready) { pendingData = d; return; }
      map.getSource('track').setData({ type: 'FeatureCollection', features: d.track && d.track.length > 1
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: d.track } }] : [] });
      map.getSource('lines').setData({ type: 'FeatureCollection', features: lineFeatures(d.lines) });
      map.getSource('points').setData({ type: 'FeatureCollection', features: pointFeatures(d.points) });
      map.getSource('user').setData({ type: 'FeatureCollection', features: d.user
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [d.user.lon, d.user.lat] } }] : [] });

      markers.forEach(function (m) { m.remove(); });
      markers = (d.marks || []).map(function (mk) {
        var el = document.createElement('div');
        el.className = 'mark';
        el.textContent = '📍';
        el.title = mk.label || '';
        return new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([mk.lon, mk.lat]).addTo(map);
      });

      var all = [];
      (d.lines || []).forEach(function (l) { all = all.concat(l.coords); });
      if (d.track) all = all.concat(d.track);
      (d.points || []).forEach(function (p) { all.push([p.lon, p.lat]); });

      if (d.follow && d.user) {
        map.easeTo({ center: [d.user.lon, d.user.lat], duration: 600 });
      } else if (d.fit && all.length > 1) {
        var b = all.reduce(function (acc, c) { return acc.extend(c); },
          new maplibregl.LngLatBounds(all[0], all[0]));
        map.fitBounds(b, { padding: 40, duration: 0, maxZoom: 17 });
      } else if (d.fit && all.length === 1) {
        map.jumpTo({ center: all[0], zoom: 16 });
      } else if (d.center) {
        map.jumpTo({ center: [d.center.lon, d.center.lat], zoom: d.zoom || 15 });
      }
    };

    window.__snap = function () {
      var grab = function () {
        try {
          send({ type: 'snapshot', data: map.getCanvas().toDataURL('image/png').split(',')[1] });
        } catch (err) {
          send({ type: 'snapshot', data: null, error: String(err) });
        }
      };
      if (map.loaded()) { map.triggerRepaint(); requestAnimationFrame(grab); }
      else { map.once('idle', function () { requestAnimationFrame(grab); }); }
    };
  }

  // ---------------- Che do don gian (canvas 2D, khong can WebGL) ----------------
  function startFallback() {
    var cv = document.createElement('canvas');
    cv.style.width = '100%'; cv.style.height = '100%'; cv.style.display = 'block';
    document.getElementById('map').appendChild(cv);
    var ctx = cv.getContext('2d');
    var data = null, proj = null;

    function resize() {
      var r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    window.addEventListener('resize', resize);

    function collect(d) {
      var all = [];
      (d.lines || []).forEach(function (l) { all = all.concat(l.coords); });
      if (d.track) all = all.concat(d.track);
      (d.points || []).forEach(function (p) { all.push([p.lon, p.lat]); });
      (d.marks || []).forEach(function (m) { all.push([m.lon, m.lat]); });
      if (d.user) all.push([d.user.lon, d.user.lat]);
      return all;
    }

    function makeProj(all, w, h) {
      if (!all.length) return null;
      var lons = all.map(function (c) { return c[0]; }), lats = all.map(function (c) { return c[1]; });
      var minLon = Math.min.apply(null, lons), maxLon = Math.max.apply(null, lons);
      var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats);
      var midLat = (minLat + maxLat) / 2, k = Math.cos(midLat * Math.PI / 180);
      var dx = Math.max((maxLon - minLon) * k, 1e-6), dy = Math.max(maxLat - minLat, 1e-6);
      var pad = 28, sw = Math.max(1, w - pad * 2), sh = Math.max(1, h - pad * 2);
      var scale = Math.min(sw / dx, sh / dy);
      var ox = pad + (sw - dx * scale) / 2, oy = pad + (sh - dy * scale) / 2;
      return {
        to: function (lon, lat) { return [ox + (lon - minLon) * k * scale, oy + (maxLat - lat) * scale]; },
        from: function (x, y) { return [minLon + (x - ox) / (k * scale), maxLat - (y - oy) / scale]; }
      };
    }

    function stroke(coords, color, width) {
      if (!coords || coords.length < 2) return;
      ctx.beginPath();
      coords.forEach(function (c, i) {
        var p = proj.to(c[0], c[1]);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      });
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.stroke();
    }

    function dot(lon, lat, color, r) {
      var p = proj.to(lon, lat);
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
    }

    function draw() {
      var w = cv.clientWidth, h = cv.clientHeight;
      ctx.fillStyle = '#F2F4F8'; ctx.fillRect(0, 0, w, h);
      if (!data) return;
      proj = makeProj(collect(data), w, h);
      if (!proj) return;
      stroke(data.track, '#9AA1AD', 3);
      (data.lines || []).forEach(function (l) { stroke(l.coords, l.color, 6); });
      (data.points || []).forEach(function (p) { dot(p.lon, p.lat, p.color, 5); });
      (data.marks || []).forEach(function (m) { dot(m.lon, m.lat, '#EF4444', 6); });
      if (data.user) dot(data.user.lon, data.user.lat, '#2E8BFF', 7);
    }

    cv.addEventListener('click', function (e) {
      if (!data || !proj) return;
      var r = cv.getBoundingClientRect();
      var ll = proj.from(e.clientX - r.left, e.clientY - r.top);
      var best = null, bestD = Infinity;
      (data.lines || []).forEach(function (l, i) {
        l.coords.forEach(function (c) {
          var d = Math.pow(c[0] - ll[0], 2) + Math.pow(c[1] - ll[1], 2);
          if (d < bestD) { bestD = d; best = i; }
        });
      });
      (data.points || []).forEach(function (p) {
        var d = Math.pow(p.lon - ll[0], 2) + Math.pow(p.lat - ll[1], 2);
        if (d < bestD) { bestD = d; best = p.index; }
      });
      if (best !== null) send({ type: 'press', index: best, latitude: ll[1], longitude: ll[0] });
    });

    window.__apply = function (d) { data = d; resize(); };
    window.__snap = function () {
      try { send({ type: 'snapshot', data: cv.toDataURL('image/png').split(',')[1] }); }
      catch (err) { send({ type: 'snapshot', data: null, error: String(err) }); }
    };
    resize();
    flushPending();
    send({ type: 'ready', webgl: false });
  }

  // Nap MapLibre bang createElement (khong dung document.write — de hong HTML)
  if (hasWebGL) {
    var tag = document.createElement('script');
    tag.src = '${MAPLIBRE_JS}';
    tag.onload = function () { startMap(); };
    tag.onerror = function () { startFallback(); };   // khong co mang / CDN chan
    document.head.appendChild(tag);
  } else {
    startFallback();
  }
</script></body></html>`;

export const WebMapView = forwardRef(function WebMapView(
  { lines, track, points, marks, user, region, follow, fit = true, onPressLine, style,
    zoomControl = true, attributionPosition = 'bottom-right', bottomInset = 0, topInset = 0 },
  ref
) {
  const html = useMemo(
    () => buildHtml({ zoomControl, attributionPosition, bottomInset, topInset }),
    [zoomControl, attributionPosition, bottomInset, topInset]
  );
  const { t } = useT();
  const webRef = useRef(null);
  const readyRef = useRef(false);
  const snapRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Ban do khong len (mat mang, CDN bi chan...) → bao ro thay vi de trang
  React.useEffect(() => {
    const id = setTimeout(() => { if (!readyRef.current) setTimedOut(true); }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, []);

  const payload = useMemo(() => JSON.stringify({
    lines: (lines || []).map(l => ({ color: l.color, coords: l.coords.map(toLngLat) })),
    track: (track || []).map(toLngLat),
    points: points || [],
    marks: marks || [],
    user: user || null,
    center: region ? { lat: region.latitude, lon: region.longitude } : null,
    follow: !!follow,
    fit: !!fit,
  }), [lines, track, points, marks, user, region, follow, fit]);

  const push = useCallback(() => {
    if (!readyRef.current || !webRef.current) return;
    webRef.current.injectJavaScript(`window.__setData(${JSON.stringify(payload)});true;`);
  }, [payload]);

  // Day du lieu moi moi khi payload doi
  React.useEffect(() => { push(); }, [push]);

  useImperativeHandle(ref, () => ({
    snapshot: () => new Promise((resolve) => {
      if (!readyRef.current || !webRef.current) { resolve(null); return; }
      const timer = setTimeout(() => { snapRef.current = null; resolve(null); }, SNAPSHOT_TIMEOUT_MS);
      snapRef.current = (data) => { clearTimeout(timer); resolve(data || null); };
      webRef.current.injectJavaScript('window.__snap();true;');
    }),
  }), []);

  const onMessage = useCallback((e) => {
    let msg;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.type === 'ready') {
      readyRef.current = true;
      setReady(true);
      setTimedOut(false);
      if (msg.webgl === false) setSimpleMode(true);
      push();
    } else if (msg.type === 'press') {
      onPressLine?.(msg.index, { latitude: msg.latitude, longitude: msg.longitude });
    } else if (msg.type === 'maperror') {
      console.warn('[MAP]', msg.message);
    } else if (msg.type === 'snapshot') {
      snapRef.current?.(msg.data);
      snapRef.current = null;
    }
  }, [onPressLine, push]);

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://openfreemap.org' }}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        overScrollMode="never"
        onMessage={onMessage}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
      />
      {(failed || timedOut) && !ready && (
        <View style={styles.notice} pointerEvents="none">
          <Text style={styles.noticeTitle}>{t('map.offlineTitle')}</Text>
          <Text style={styles.noticeHint}>{t('map.offlineHint')}</Text>
        </View>
      )}
      {ready && simpleMode && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{t('map.simpleMode')}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { backgroundColor: COLORS.surfaceMuted, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: COLORS.surfaceMuted },
  notice: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '38%',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noticeTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  noticeHint: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 17 },
  badge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },
});
