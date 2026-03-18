import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const TYPE_COLORS = {
  surface: '#2e7d32',
  'multi-storey': '#1565c0',
  underground: '#4a148c',
  street_side: '#e65100',
  private: '#6a1b9a',
  public: '#2e7d32',
};

function buildMapHTML({ centerLat, centerLng, zoom = 14, markers = [], route = null, userLat, userLng }) {
  const initData = JSON.stringify({ centerLat, centerLng, zoom, markers, route, userLat, userLng });

  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden}
    #map{width:100vw;height:100vh}
    .leaflet-control-zoom{margin:8px}
  </style>
</head>
<body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function(){
  var cfg = ${initData};
  var map = L.map('map',{zoomControl:true,attributionControl:false})
    .setView([cfg.centerLat,cfg.centerLng],cfg.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  var TYPE_COLORS = {
    'surface':'#2e7d32','multi-storey':'#1565c0','underground':'#4a148c',
    'street_side':'#e65100','private':'#6a1b9a','public':'#2e7d32'
  };

  function pMarker(color,size,emoji){
    size = size||32;
    return L.divIcon({
      className:'',
      html:'<div style="width:'+size+'px;height:'+size+'px;background:'+color+';border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 5px rgba(0,0,0,.4)"><span style="display:block;transform:rotate(45deg);text-align:center;line-height:'+(size-4)+'px;font-size:'+(size*0.4)+'px;font-weight:bold;color:white">'+(emoji||'P')+'</span></div>',
      iconSize:[size,size],iconAnchor:[size/2,size],popupAnchor:[0,-(size+4)]
    });
  }

  var userMarker = null;
  function setUser(lat,lng){
    var icon = L.divIcon({
      className:'',
      html:'<div style="width:14px;height:14px;background:#f0a500;border-radius:50%;border:3px solid #1a3c5e;box-shadow:0 0 8px rgba(240,165,0,.7)"></div>',
      iconSize:[14,14],iconAnchor:[7,7]
    });
    if(userMarker){userMarker.setLatLng([lat,lng]);}
    else{userMarker=L.marker([lat,lng],{icon:icon}).addTo(map).bindPopup('You are here');}
  }

  if(cfg.userLat&&cfg.userLng) setUser(cfg.userLat,cfg.userLng);

  cfg.markers.forEach(function(m,i){
    var color = TYPE_COLORS[m.type]||'#1a3c5e';
    var mk = L.marker([m.lat,m.lng],{icon:pMarker(color)}).addTo(map);
    var popup = '<b>'+(m.name||'Parking')+'</b>';
    if(m.rate) popup += '<br>'+m.rate;
    if(m.address) popup += '<br><small>'+m.address+'</small>';
    mk.bindPopup(popup);
    mk.on('click',function(){
      if(window.ReactNativeWebView){
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'markerClick',index:i,id:m.id}));
      }
    });
  });

  var routeLayer = null;
  if(cfg.route&&cfg.route.length>1){
    routeLayer = L.polyline(cfg.route,{color:'#1a3c5e',weight:4,opacity:.85,dashArray:'8,6'}).addTo(map);
    var dest = cfg.route[cfg.route.length-1];
    L.marker(dest,{icon:pMarker('#f0a500',36,'P')}).addTo(map);
    map.fitBounds(routeLayer.getBounds(),{padding:[20,20]});
  }

  // Dynamic update functions callable via injectJavaScript
  window.updateUserPosition = function(lat,lng){
    setUser(lat,lng);
    map.panTo([lat,lng]);
  };

  window.drawRoute = function(coords){
    if(routeLayer){map.removeLayer(routeLayer);}
    routeLayer = L.polyline(coords,{color:'#1a3c5e',weight:4,opacity:.85,dashArray:'8,6'}).addTo(map);
    var dest = coords[coords.length-1];
    L.marker(dest,{icon:pMarker('#f0a500',36,'P')}).addTo(map);
    map.fitBounds(routeLayer.getBounds(),{padding:[20,20]});
  };
})();
</script>
</body></html>`;
}

/**
 * LeafletMapView — renders an OpenStreetMap-based map via WebView + Leaflet.
 *
 * Props:
 *   centerLat, centerLng  — initial map center
 *   zoom                  — initial zoom (default 14)
 *   markers               — [{id, lat, lng, type, name, address, rate}]
 *   route                 — [[lat,lng], ...] polyline coordinates
 *   userLat, userLng      — user position (gold dot marker)
 *   onMarkerPress(index, id) — called when a parking marker is tapped
 *   style                 — additional style for the container View
 *
 * Ref methods:
 *   updateUserPosition(lat, lng) — move the user dot without re-rendering
 *   drawRoute(coords)            — draw/update a route polyline
 */
const LeafletMapView = forwardRef(function LeafletMapView(
  { centerLat, centerLng, zoom, markers, route, userLat, userLng, onMarkerPress, style },
  ref
) {
  const webViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    updateUserPosition(lat, lng) {
      webViewRef.current?.injectJavaScript(`window.updateUserPosition(${lat},${lng}); true;`);
    },
    drawRoute(coords) {
      const json = JSON.stringify(coords);
      webViewRef.current?.injectJavaScript(`window.drawRoute(${json}); true;`);
    },
  }));

  const html = buildMapHTML({ centerLat, centerLng, zoom, markers: markers || [], route, userLat, userLng });

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick' && onMarkerPress) {
        onMarkerPress(data.index, data.id);
      }
    } catch (_) {}
  }, [onMarkerPress]);

  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={[styles.map, style]}
      onMessage={handleMessage}
      javaScriptEnabled
      originWhitelist={['*']}
      mixedContentMode="always"
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
});

export default LeafletMapView;

const styles = StyleSheet.create({
  map: { flex: 1 },
});
