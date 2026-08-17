/**
 * AppHeader - Global search header bar shown on all views
 */

import { useState } from 'react';

export default function AppHeader() {
  const [searchQuery, setSearchQuery] = useState('backhoe damage near SE-MCA-2211');

  return (
    <header className="search-header-bar">
      <div className="search-header-bar__left">
        <div className="search-header-bar__title">Incident Intelligence</div>
        <div className="search-header-bar__connection">
          att-demo.r9xpj.mongodb.net
        </div>
        <div className="search-header-bar__collection">incident_events</div>
      </div>

      <div className="search-header-bar__center">
        <div className="search-header-bar__input-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-header-bar__input"
            placeholder="Search incidents..."
          />
          <span className="search-header-bar__badge">voyage-4</span>
        </div>
        <button className="search-header-bar__btn">Search</button>
      </div>

      <div className="search-header-bar__right">
        <span className="search-header-bar__events">323 events</span>
      </div>
    </header>
  );
}
