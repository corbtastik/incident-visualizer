import React, { useState, useCallback, useEffect, useMemo } from 'react';
import NavigationBar from './NavigationBar.jsx';

// View definitions with canvas positions (used in overview mode)
const VIEWS = [
  { id: 'live', label: 'Live Map', x: 0, y: 0 },
  { id: 'heatmap', label: 'Heatmap', x: 1600, y: 0 },
  { id: 'search', label: 'Search Explorer', x: 3200, y: 0 },
];

// Standard view dimensions for overview thumbnails
const VIEW_WIDTH = 1440;
const VIEW_HEIGHT = 900;

function calculateOverviewTransform(views, viewport) {
  if (views.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 };

  // Calculate bounding box
  const minX = Math.min(...views.map(v => v.x));
  const maxX = Math.max(...views.map(v => v.x + VIEW_WIDTH));
  const minY = Math.min(...views.map(v => v.y));
  const maxY = Math.max(...views.map(v => v.y + VIEW_HEIGHT));

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;

  // Calculate scale to fit with padding
  const padding = 80;
  const availableWidth = viewport.width - padding * 2;
  const availableHeight = viewport.height - padding * 2 - 60; // account for nav bar

  const scaleX = availableWidth / contentWidth;
  const scaleY = availableHeight / contentHeight;
  const scale = Math.min(scaleX, scaleY, 0.5); // cap at 0.5 for readability

  // Center the content
  const scaledWidth = contentWidth * scale;
  const scaledHeight = contentHeight * scale;
  const offsetX = (viewport.width - scaledWidth) / 2 - minX * scale;
  const offsetY = (viewport.height - scaledHeight - 60) / 2 - minY * scale;

  return { scale, offsetX, offsetY };
}

export default function ViewNavigator({ children }) {
  const [currentView, setCurrentView] = useState('live');
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });

  const isOverview = currentView === 'overview';

  // Track viewport size
  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'Escape':
          setCurrentView('overview');
          break;
        case '1':
          setCurrentView('live');
          break;
        case '2':
          setCurrentView('heatmap');
          break;
        case '3':
          setCurrentView('search');
          break;
        case 'ArrowLeft':
          setCurrentView(prev => {
            if (prev === 'overview') return prev;
            const idx = VIEWS.findIndex(v => v.id === prev);
            return idx > 0 ? VIEWS[idx - 1].id : prev;
          });
          break;
        case 'ArrowRight':
          setCurrentView(prev => {
            if (prev === 'overview') return prev;
            const idx = VIEWS.findIndex(v => v.id === prev);
            return idx < VIEWS.length - 1 ? VIEWS[idx + 1].id : prev;
          });
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const overviewTransform = useMemo(() => {
    return calculateOverviewTransform(VIEWS, viewport);
  }, [viewport]);

  const handleViewClick = useCallback((viewId) => {
    if (isOverview) {
      setCurrentView(viewId);
    }
  }, [isOverview]);

  const handleNavigate = useCallback((viewId) => {
    setCurrentView(viewId);
  }, []);

  // Calculate style for each view based on current mode
  const getViewStyle = (viewDef) => {
    if (isOverview) {
      // Position as thumbnail in overview
      const { scale, offsetX, offsetY } = overviewTransform;
      return {
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${VIEW_WIDTH}px`,
        height: `${VIEW_HEIGHT}px`,
        transform: `translate(${offsetX + viewDef.x * scale}px, ${offsetY + viewDef.y * scale}px) scale(${scale})`,
        transformOrigin: '0 0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease',
      };
    } else {
      // Fullscreen or hidden
      const isActive = currentView === viewDef.id;
      return {
        position: 'absolute',
        inset: 0,
        visibility: isActive ? 'visible' : 'hidden',
        pointerEvents: isActive ? 'auto' : 'none',
        zIndex: isActive ? 1 : 0,
        transition: 'none',
      };
    }
  };

  // Always render all views in the same structure to preserve state
  const renderViews = () => {
    return React.Children.map(children, child => {
      if (!React.isValidElement(child)) return null;
      const viewDef = VIEWS.find(v => v.id === child.props.viewId);
      if (!viewDef) return null;

      return (
        <div
          key={viewDef.id}
          className={`view-wrapper ${isOverview ? 'view-wrapper--overview' : ''}`}
          style={getViewStyle(viewDef)}
          onClick={isOverview ? () => handleViewClick(viewDef.id) : undefined}
        >
          {/* Label shown in overview mode */}
          {isOverview && (
            <div className="view-wrapper__label">{viewDef.label}</div>
          )}

          {/* Hover overlay in overview mode */}
          {isOverview && <div className="view-wrapper__overlay" />}

          {/* The actual view content */}
          <div className="view-wrapper__content">
            {child}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="view-navigator">
      {/* Views container */}
      <div className="view-container">
        {renderViews()}
      </div>

      {/* Navigation bar */}
      <NavigationBar
        views={VIEWS}
        currentView={currentView}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

export { VIEWS, VIEW_WIDTH, VIEW_HEIGHT };
