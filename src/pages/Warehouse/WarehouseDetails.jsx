import React from 'react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import WhiteIsland from '../../components/Whiteisland';
import WarehouseItemsList from '../../components/Warehouse/WarehouseItemsList';
import styles from './WarehouseDetails.module.css';

const DUMMY_WAREHOUSE_DETAILS = {
    'WH-001': {
        warehouseID: 'WH-001',
        address: '58 Greenpark Ave, Amsterdam',
        storage: 'Dry Storage',
        space: 'Space Available',
        manager: 'A. Vermeer'
    },
    'WH-002': {
        warehouseID: 'WH-002',
        address: '14 Canal Street, Rotterdam',
        storage: 'Cold Storage',
        space: 'Full',
        manager: 'K. Janssen'
    }
};

const DUMMY_WAREHOUSE_ITEMS = [
    { id: 'INS-1001', type: 'Instance', name: 'Tulip Batch A', status: 'Ready', quantity: 120 },
    { id: 'INS-1002', type: 'Instance', name: 'Tulip Batch B', status: 'Processing', quantity: 80 },
    { id: 'SMP-2001', type: 'Sample', name: 'Color Test Sample', status: 'Stored', quantity: 16 },
    { id: 'SMP-2002', type: 'Sample', name: 'Durability Sample', status: 'QA Hold', quantity: 9 }
];

export default function WarehouseDetails() {
    const navigate = useNavigate();
    const { warehouseId } = useParams();

    const details = useMemo(() => {
        const key = decodeURIComponent(warehouseId || '');
        return (
            DUMMY_WAREHOUSE_DETAILS[key] || {
                warehouseID: key || 'WH-UNKNOWN',
                address: 'Demo Address',
                storage: 'Mixed Storage',
                space: 'Space Available',
                manager: 'Demo Manager'
            }
        );
    }, [warehouseId]);

    return (
        <>
            <h2 className={styles.title}>Warehouse Details</h2>
            <WhiteIsland className="WhiteIsland">
                <div className={styles.page}>
                    <button className={styles.backButton} onClick={() => navigate('/Warehouse')}>
                        ← Back To Warehouses
                    </button>

                    <div className={styles.detailsCard}>
                        <div>
                            <span className={styles.label}>Warehouse ID</span>
                            <p className={styles.value}>{details.warehouseID}</p>
                        </div>
                        <div>
                            <span className={styles.label}>Address</span>
                            <p className={styles.value}>{details.address}</p>
                        </div>
                        <div>
                            <span className={styles.label}>Storage Type</span>
                            <p className={styles.value}>{details.storage}</p>
                        </div>
                        <div>
                            <span className={styles.label}>Space</span>
                            <p className={styles.value}>{details.space}</p>
                        </div>
                        <div>
                            <span className={styles.label}>Manager</span>
                            <p className={styles.value}>{details.manager}</p>
                        </div>
                    </div>

                    <WarehouseItemsList items={DUMMY_WAREHOUSE_ITEMS} />
                </div>
            </WhiteIsland>
        </>
    );
}
