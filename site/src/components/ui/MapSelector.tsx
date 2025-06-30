import React, { useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMapEvents, Marker, Popup } from 'react-leaflet';
import { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Фикс для иконок маркеров
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapSelectorProps {
  onAreaSelected: (area: { lat: number; lng: number; radius: number }) => void;
  onClose: () => void;
  initialArea?: { lat: number; lng: number; radius: number } | null;
}

interface AreaPolygon {
  center: LatLng;
  points: LatLng[];
  radius: number;
}

const MapSelector: React.FC<MapSelectorProps> = ({ onAreaSelected, onClose, initialArea }) => {
  const [selectedPoints, setSelectedPoints] = useState<LatLng[]>([]);
  const [area, setArea] = useState<AreaPolygon | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Компонент для обработки кликов по карте
  const MapEvents = () => {
    useMapEvents({
      click: (e) => {
        if (!isDrawing) return;
        
        const newPoint = e.latlng;
        setSelectedPoints(prev => [...prev, newPoint]);
      }
    });
    return null;
  };

  // Начать выделение области
  const startDrawing = () => {
    setSelectedPoints([]);
    setArea(null);
    setIsDrawing(true);
  };

  // Завершить выделение и создать область
  const finishDrawing = () => {
    if (selectedPoints.length < 3) {
      alert('Выберите минимум 3 точки для создания области');
      return;
    }

    // Вычисляем центр и радиус области
    const center = calculateCenter(selectedPoints);
    const radius = calculateRadius(center, selectedPoints);
    
    const newArea: AreaPolygon = {
      center,
      points: selectedPoints,
      radius
    };
    
    setArea(newArea);
    setIsDrawing(false);
  };

  // Отменить выделение
  const cancelDrawing = () => {
    setSelectedPoints([]);
    setArea(null);
    setIsDrawing(false);
  };

  // Сохранить выбранную область
  const saveArea = () => {
    if (!area) {
      alert('Сначала выделите область на карте');
      return;
    }

    onAreaSelected({
      lat: area.center.lat,
      lng: area.center.lng,
      radius: Math.round(area.radius)
    });
    onClose();
  };

  // Вычисление центра области
  const calculateCenter = (points: LatLng[]): LatLng => {
    const sumLat = points.reduce((sum, point) => sum + point.lat, 0);
    const sumLng = points.reduce((sum, point) => sum + point.lng, 0);
    return new LatLng(sumLat / points.length, sumLng / points.length);
  };

  // Вычисление радиуса области (максимальное расстояние от центра до точки)
  const calculateRadius = (center: LatLng, points: LatLng[]): number => {
    let maxDistance = 0;
    points.forEach(point => {
      const distance = center.distanceTo(point) / 1000; // в километрах
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    });
    return maxDistance;
  };

  // Начальная позиция карты (Москва по умолчанию)
  const defaultPosition: [number, number] = initialArea 
    ? [initialArea.lat, initialArea.lng] 
    : [55.7558, 37.6176];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Панель управления */}
      <div style={{
        background: 'white',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Выбор территории показа рекламы</h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          ×
        </button>
      </div>

      {/* Панель инструментов */}
      <div style={{
        background: '#f5f5f5',
        padding: '0.75rem',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        borderBottom: '1px solid #ddd'
      }}>
        {!isDrawing && !area && (
          <button
            onClick={startDrawing}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Начать выделение области
          </button>
        )}

        {isDrawing && (
          <>
            <span style={{ marginRight: '1rem', color: '#666' }}>
              Кликайте по карте чтобы выделить область. Точек: {selectedPoints.length}
            </span>
            <button
              onClick={finishDrawing}
              disabled={selectedPoints.length < 3}
              style={{
                background: selectedPoints.length >= 3 ? '#28a745' : '#ccc',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: selectedPoints.length >= 3 ? 'pointer' : 'not-allowed'
              }}
            >
              Завершить выделение
            </button>
            <button
              onClick={cancelDrawing}
              style={{
                background: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Отмена
            </button>
          </>
        )}

        {area && (
          <>
            <span style={{ marginRight: '1rem', color: '#666' }}>
              Область выделена. Радиус: ~{Math.round(area.radius)} км
            </span>
            <button
              onClick={saveArea}
              style={{
                background: '#28a745',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Сохранить область
            </button>
            <button
              onClick={cancelDrawing}
              style={{
                background: '#ffc107',
                color: 'black',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Выделить заново
            </button>
          </>
        )}
      </div>

      {/* Карта */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={defaultPosition}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapEvents />
          
          {/* Отображение выбранных точек */}
          {selectedPoints.map((point, index) => (
            <Marker key={index} position={point}>
              <Popup>Точка {index + 1}</Popup>
            </Marker>
          ))}
          
          {/* Отображение выделенной области */}
          {area && (
            <>
              <Polygon
                positions={area.points}
                color="blue"
                fillColor="blue"
                fillOpacity={0.3}
              />
              <Marker position={area.center}>
                <Popup>
                  Центр области<br/>
                  Радиус: ~{Math.round(area.radius)} км
                </Popup>
              </Marker>
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapSelector; 