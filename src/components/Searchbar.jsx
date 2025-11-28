import React from 'react'

function Searchbar() {
    return (
        <div className="searchBar">
            <input
                type="text"
                className={`searchInput ${collapsed ? 'hidden' : ''}`}
                placeholder="Search..."
            />
        </div>
    )
}

export default Searchbar
