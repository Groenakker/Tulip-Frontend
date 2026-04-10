import React from 'react';
import styles from './WarehouseItemsList.module.css';

export default function WarehouseItemsList({ items }) {
    return (
        <div className={styles.wrapper}>
            <h3 className={styles.title}>Current Items In Warehouse</h3>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Item Type</th>
                        <th>Item ID</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td>{item.type}</td>
                            <td>{item.id}</td>
                            <td>{item.name}</td>
                            <td>{item.status}</td>
                            <td>{item.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
