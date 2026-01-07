import React, { useState, useEffect, useRef } from 'react';
import WhiteIsland from '../../../components/Whiteisland';
import styles from './SSDetails.module.css';
import { FaSave, FaTrash, FaImage, FaEdit, } from "react-icons/fa";
import Modal from '../../../components/Modal';
import SignatureCanvas from 'react-signature-canvas';
import toast from '../../../components/Toaster/toast';
import TestCodeChecklist from '../../../components/modals/TestCodeChecklist';
import { useParams, useNavigate } from 'react-router-dom';

export default function SSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    //image modal
    const [viewingImage, setViewingImage] = useState(null);
    const [showTestCodeModal, setShowTestCodeModal] = useState(false);

    const sigCanvas = useRef({});
    const [signatureData, setSignatureData] = useState({
        signature: null
    });
    const handleAddTest = () => {
        setShowTestCodeModal(true);
    };

    const handleTestSelected = (selectedTests) => {
        // Add selected tests to the tests array
        const newTests = selectedTests.map((test, index) => ({
            id: Date.now() + index, // Generate unique ID
            testCodeId: test._id || test.id,
            grkCode: test.code || test.grkCode || '',
            description: test.descriptionLong || test.descriptionShort || test.description || '',
            samplesSubmitted: '',
            extractionTime: '',
            extractionTemp: '',
            quality: 'GLP',
            category: test.category || '',
            extractBased: test.extractBased || ''
        }));
        setTests(prev => [...prev, ...newTests]);
        setShowTestCodeModal(false);
    };

    const handleRemoveTest = (testId) => {
        setTests(prev => prev.filter(t => t.id !== testId));
    };

    //Sample info data
    const [sample, setSample] = useState({
        SAPid: '',
        bPartnerCode: '', // Add bPartnerCode field
        projectId: '',
        projectName: '',
        formStatus: '',
        client: '',
        address: '',
        sponsor: '',
        email: '',
        phone: '',
        image: null,
        sampleId: '',
        sampleDescription: '',
        intendedUse: '',
        partNumber: '',
        lotNumber: '',
        devicesUsed: '1',
        countryOrigin: '',
        sampleMass: '',
        surfaceArea: '',
        contactType: '',
        contactDuration: '',
        manufacturer: '',
        desiredMarkets: '',
        manufactureDate: '',
        expirationDate: '',
        wallThickness: '',
        extractionRatios: '',
        sampleSterile: '',
        sterilizationMethod: '',
        appearance: '',
        deviceType: '', // Radio options: Device, Solid, Liquid, Gel
        materialsOfConstruction: '',

        // Extra info
        shippingCondition: '',
        sampleStorage: '',
        sampleDisposition: '',
        safetyPrecautions: '',
        sampleImages: {
            general: null,
            labeling: null
        }
    });


    //Requested tests data
    const [tests, setTests] = useState([]);



    //Requested test extra data
    const [testMetadata, setTestMetadata] = useState({
        totalSamplesSubmitted: '',
        serviceLevel: 'Standard',
        notes: ''
    });


    // Handle image change for sample images
    const handleSampleImageChange = (type, e) => {
        const file = e.target.files[0];
        if (file) {
            setSample(prev => ({
                ...prev,
                sampleImages: {
                    ...prev.sampleImages,
                    [type]: URL.createObjectURL(file)
                }
            }));
        }
    };

    // Handle change for other sample fields
    const handleChange = (e) => {
        const { name, value } = e.target;
        setSample(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...sample,
                status: sample.formStatus || 'Draft',
                description: sample.sampleDescription,
                formData: sample,
                requestedTests: tests.filter(t => t.grkCode || t.description), // Only save tests with data
                testMetadata: testMetadata
            };
            
            const url = id === 'add' 
                ? `${import.meta.env.VITE_BACKEND_URL}/api/samples`
                : `${import.meta.env.VITE_BACKEND_URL}/api/samples/${id}`;
            const method = id === 'add' ? 'POST' : 'PUT';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) throw new Error('Failed to save');
            
            const saved = await res.json();
            toast.success('Sample saved!');
            
            // If it was a new sample, navigate to the saved sample's ID
            if (id === 'add' && saved._id) {
                navigate(`/SampleSubmission/SSDetail/${saved._id}`, { replace: true });
            }
        } catch (e) {
            console.error('Error saving sample:', e);
            toast.error('Failed to save sample');
        }
    };

    const handleDelete = async () => {
        if (id === 'add') {
            navigate('/SampleSubmission');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this sample?')) return;
        
        try {
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast.warning('Sample deleted!');
            navigate('/SampleSubmission');
        } catch (e) {
            console.error('Error deleting sample:', e);
            toast.error('Failed to delete sample');
        }
    };

    // Handle change for sample image
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSample(prev => ({ ...prev, image: URL.createObjectURL(file) }));
        }
    };

    // Function to adjust input area height
    const adjustTextareaHeight = (element) => {
        if (!element) return;
        element.style.height = 'auto';
        element.style.height = `${element.scrollHeight}px`;
    };

    // Load data and trigger textarea height adjustment
    useEffect(() => {
        const load = async () => {
            try {
                if (id && id !== 'add') {
                    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        // Map backend data to frontend state
                        const formData = data.formData || {};
                        
                        // Merge formData with top-level data, prioritizing formData
                        const mergedData = {
                            ...data,
                            ...formData,
                            // Override with formData values if they exist
                            SAPid: formData.SAPid || data.SAPid || '',
                            bPartnerCode: formData.bPartnerCode || data.bPartnerCode || '',
                            projectId: formData.projectId || data.projectID || formData.projectID || '',
                            formStatus: data.status || formData.formStatus || 'Draft',
                            sampleDescription: data.description || formData.sampleDescription || '',
                            image: data.image || formData.image || null,
                            sampleImages: formData.sampleImages || data.sampleImages || { general: null, labeling: null }
                        };
                        
                        // Set sample state with defaults for missing fields
                        setSample(prev => ({
                            SAPid: '',
                            bPartnerCode: '',
                            projectId: '',
                            projectName: '',
                            formStatus: 'Draft',
                            client: '',
                            address: '',
                            sponsor: '',
                            email: '',
                            phone: '',
                            image: null,
                            sampleId: '',
                            sampleDescription: '',
                            intendedUse: '',
                            partNumber: '',
                            lotNumber: '',
                            devicesUsed: '1',
                            countryOrigin: '',
                            sampleMass: '',
                            surfaceArea: '',
                            contactType: '',
                            contactDuration: '',
                            manufacturer: '',
                            desiredMarkets: 'U',
                            manufactureDate: '',
                            expirationDate: '',
                            wallThickness: '',
                            extractionRatios: '',
                            sampleSterile: '',
                            sterilizationMethod: '',
                            appearance: '',
                            deviceType: '',
                            materialsOfConstruction: '',
                            shippingCondition: '',
                            sampleStorage: '',
                            sampleDisposition: '',
                            safetyPrecautions: '',
                            sampleImages: {
                                general: null,
                                labeling: null
                            },
                            ...mergedData
                        }));
                        
                        // Load requested tests if they exist
                        if (data.requestedTests && Array.isArray(data.requestedTests) && data.requestedTests.length > 0) {
                            // Ensure each test has an id
                            const testsWithIds = data.requestedTests.map((test, index) => ({
                                ...test,
                                id: test.id || Date.now() + index
                            }));
                            setTests(testsWithIds);
                        } else {
                            setTests([]);
                        }
                        
                        // Load test metadata if it exists
                        if (data.testMetadata) {
                            setTestMetadata({
                                totalSamplesSubmitted: data.testMetadata.totalSamplesSubmitted || '',
                                serviceLevel: data.testMetadata.serviceLevel || 'Standard',
                                notes: data.testMetadata.notes || ''
                            });
                        } else {
                            setTestMetadata({
                                totalSamplesSubmitted: '',
                                serviceLevel: 'Standard',
                                notes: ''
                            });
                        }
                    }
                } else if (id === 'add') {
                    // Reset to empty state for new sample
                    setSample({
                        SAPid: '',
                        bPartnerCode: '',
                        projectId: '',
                        projectName: '',
                        formStatus: 'Draft',
                        client: '',
                        address: '',
                        sponsor: '',
                        email: '',
                        phone: '',
                        image: null,
                        sampleId: '',
                        sampleDescription: '',
                        intendedUse: '',
                        partNumber: '',
                        lotNumber: '',
                        devicesUsed: '1',
                        countryOrigin: '',
                        sampleMass: '',
                        surfaceArea: '',
                        contactType: '',
                        contactDuration: '',
                        manufacturer: '',
                        desiredMarkets: 'U',
                        manufactureDate: '',
                        expirationDate: '',
                        wallThickness: '',
                        extractionRatios: '',
                        sampleSterile: '',
                        sterilizationMethod: '',
                        appearance: '',
                        deviceType: '',
                        materialsOfConstruction: '',
                        shippingCondition: '',
                        sampleStorage: '',
                        sampleDisposition: '',
                        safetyPrecautions: '',
                        sampleImages: {
                            general: null,
                            labeling: null
                        }
                    });
                    setTests([]);
                    setTestMetadata({
                        totalSamplesSubmitted: '',
                        serviceLevel: 'Standard',
                        notes: ''
                    });
                }
            } catch (e) { 
                console.error('Error loading sample:', e);
                toast.error('Failed to load sample data');
            }
        };
        load();
    }, [id]);

    // Adjust textarea heights after sample data changes
    useEffect(() => {
        const textareas = document.getElementsByClassName(styles.autoGrowInput);
        Array.from(textareas).forEach(textarea => {
            adjustTextareaHeight(textarea);
            textarea.addEventListener('input', (e) => adjustTextareaHeight(e.target));
        });
        return () => {
            Array.from(textareas).forEach(textarea => {
                textarea.removeEventListener('input', (e) => adjustTextareaHeight(e.target));
            });
        };
    }, [sample.materialsOfConstruction, sample.safetyPrecautions, testMetadata.notes]);


    //Image click handler
    const handleImageClick = (type) => () => {
        if (sample.sampleImages[type]) {
            setViewingImage({
                src: sample.sampleImages[type],
                alt: type === 'general' ? 'General Sample Image' : 'Labeling Image'
            });
        }
    }
    //Requested test handler
    const handleTestChange = (id, field, value) => {
        setTests(prevTests =>
            prevTests.map(test =>
                test.id === id ? { ...test, [field]: value } : test
            )
        );
    };

    //Requested test metadata handler
    const handleTestMetadataChange = (e) => {
        const { name, value } = e.target;
        setTestMetadata(prev => ({ ...prev, [name]: value }));
    };

    // Calculate total samples submitted
    useEffect(() => {
        const total = tests.reduce((sum, test) => {
            const num = parseInt(test.samplesSubmitted) || 0;
            return sum + num;
        }, 0);
        setTestMetadata(prev => ({ ...prev, totalSamplesSubmitted: total.toString() }));
    }, [tests]);

    //clear signature
    const clearSignature = () => {
        sigCanvas.current.clear();
        setSignatureData({ signature: null });
    }

    //saving signature
    const saveSignature = () => {
        if (sigCanvas.current.isEmpty()) {
            toast.error("Please provide a signature first.");
            return;
        }
        const dataURL = sigCanvas.current.toDataURL('image/png');
        setSignatureData({ signature: dataURL });
        toast.success("Signature saved!");
    }
    const handleSignatureInfoChange = (e) => {
        const { name, value } = e.target;
        setSignatureData(prev => ({ ...prev, [name]: value }));
    }



    return (
        <div style={{ paddingBottom: '20px' }}>
            <div className={styles.bHeading}>
                <h2>Sample Submission Detail</h2>
                <div className={styles.savesTop}>
                    {id !== 'add' && (
                        <button className={styles.deleteButton} onClick={handleDelete}><FaTrash />Delete</button>
                    )}
                    <button className={styles.saveButton} onClick={handleSave}><FaSave />Save</button>
                </div>
            </div>


            <div className={styles.detailPage}>
                {/* WhiteIsland for sample information 1 */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Client Information</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            {/* Details for Client Info  */}
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>SAP Partner ID</div>
                                    <input name="SAPid" value={sample.SAPid} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Partner Code</div>
                                    <input name="bPartnerCode" value={sample.bPartnerCode} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Project</div>
                                    <input name="projectId" value={sample.projectId} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Form Status</div>
                                    <select className={styles.dropdown} name="formStatus" value={sample.formStatus} onChange={handleChange}>
                                        <option value="Draft">Draft</option>
                                        <option value="Submitted">Submitted</option>
                                        <option value="Accepted">Accepted</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Client</div>
                                    <input name="bPartnerName" value={sample.bPartnerName} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Address</div>
                                    <input name="address" value={sample.address} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Sponsor</div>
                                    <input name="contactName" value={sample.contactName} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Email</div>
                                    <input name="email" value={sample.email} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Phone</div>
                                    <input name="phone" value={sample.phone} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                        <div className={styles.picture}>
                            <img
                                src={sample.image ? sample.image : "/QRExample.png"}
                                width={128}
                                height={128}
                                alt="Partner"
                            />
                            <label className={styles.uploadButton}>
                                <FaImage /> Upload
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={handleImageChange}
                                />
                            </label>
                        </div>
                    </div>
                </WhiteIsland>


                {/* WhiteIsland for sample information 2 */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Sample Information for : {sample.sampleCode || sample.sampleId || '(unsaved)'}</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            {/* details for Sample Info  */}
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Sample Description</div>
                                    <input name="sampleDescription" value={sample.sampleDescription} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Intended Use</div>
                                    <input name="intendedUse" value={sample.intendedUse} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Part #</div>
                                    <input name="partNumber" value={sample.partNumber} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '50%' }}>
                                    <div className={styles.infoDetail}>Lot #</div>
                                    <input name="lotNumber" value={sample.lotNumber} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Devices Clinical Used (Dc)</div>
                                    <input name="devicesUsed" value={sample.devicesUsed} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Sample Mass (g)</div>
                                    <input name="sampleMass" value={sample.sampleMass} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Surface Area (cm²)</div>
                                    <input name="surfaceArea" value={sample.surfaceArea} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '25%' }}>
                                    <div className={styles.infoDetail}>Country of Origin</div>
                                    <input name="countryOrigin" value={sample.countryOrigin} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Type of Contact</div>
                                    <select className={styles.dropdown} name="contactType" value={sample.contactType} onChange={handleChange}>
                                        <option value="Tissue / Bone">Tissue / Bone</option>
                                        <option value="Blood">Blood</option>
                                        <option value="Skin">Skin</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Duration of Contact</div>
                                    <select className={styles.dropdown} name="contactDuration" value={sample.contactDuration} onChange={handleChange}>
                                        <option value="A - Limited (<24h)">A - Limited ( LT 24h)</option>
                                        <option value="B - Prolonged (24h-30d)">B - Prolonged (24h-30d)</option>
                                        <option value="C - Permanent (>30d)">C - Permanent ( GT 30d)</option>
                                    </select>
                                </div>

                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Manufacturer's Name</div>
                                    <input name="manufacturer" value={sample.manufacturer} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Date of Manufacture</div>
                                    <input name="manufactureDate" value={sample.manufactureDate} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Expiration Date</div>
                                    <input name="expirationDate" value={sample.expirationDate} onChange={handleChange} />
                                </div>

                            </div>
                            <div className={styles.details}>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Wall Thickness</div>
                                    <select className={styles.dropdown} name="wallThickness" value={sample.wallThickness} onChange={handleChange}>
                                        <option value=">1.0 mm">GT 1.0 mm</option>
                                        <option value="<1.0 mm">LT 1.0 mm</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Extraction Ratios</div>
                                    <select className={styles.dropdown} name="extractionRatios" value={sample.extractionRatios} onChange={handleChange}>
                                        <option value="3 cm2/ml">3 cm2/ml</option>
                                        <option value="6 cm2/ml">6 cm2/ml</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Desired Markets</div>
                                    <input name="desiredMarkets" value={sample.desiredMarkets} onChange={handleChange} />
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Sample Sterile</div>
                                    <select className={styles.dropdown} name="sampleSterile" value={sample.sampleSterile} onChange={handleChange}>
                                        <option value="Sterile">Sterile</option>
                                        <option value="Non-Sterile">Non-Sterile</option>
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '20%' }}>
                                    <div className={styles.infoDetail}>Sterilization Method</div>
                                    <select className={styles.dropdown} name="sterilizationMethod" value={sample.sterilizationMethod} onChange={handleChange}>
                                        <option value="Radiation">Radiation</option>
                                        <option value="EtO">EtO</option>
                                        <option value="Steam">Steam</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Appearance w/ Color</div>
                                    <input name="appearance" value={sample.appearance} onChange={handleChange} />
                                </div>
                            </div>

                            <div className={styles.details}>
                                <div className={styles.info}>
                                    <div className={styles.infoDetail}>Device Type</div>
                                    <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="Device"
                                                checked={sample.deviceType === 'Device'}
                                                onChange={handleChange}
                                            /> Device
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="Solid"
                                                checked={sample.deviceType === 'Solid'}
                                                onChange={handleChange}
                                            /> Solid
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="Liquid"
                                                checked={sample.deviceType === 'Liquid'}
                                                onChange={handleChange}
                                            /> Liquid
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="deviceType"
                                                value="Gel"
                                                checked={sample.deviceType === 'Gel'}
                                                onChange={handleChange}
                                            /> Gel
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Materials of Construction, Additives, Colorants, etc.</div>
                                    <textarea
                                        name="materialsOfConstruction"
                                        value={sample.materialsOfConstruction}
                                        onChange={handleChange}
                                        className={styles.autoGrowInput}
                                        rows={1}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </WhiteIsland>

                {/* Sample Conditions WhiteIsland */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3>Sample Conditions</h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            <div className={`${styles.details} ${styles.conditionsTable}`}>
                                <div className={`${styles.info} ${styles.conditionColumn}`}>
                                    <div className={styles.columnHeader}>Shipping Condition</div>
                                    <div className={styles.radioGroup}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="shippingCondition"
                                                value="Ambient"
                                                checked={sample.shippingCondition === 'Ambient'}
                                                onChange={handleChange}
                                            /> Ambient
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="shippingCondition"
                                                value="On Ice"
                                                checked={sample.shippingCondition === 'On Ice'}
                                                onChange={handleChange}
                                            /> On Ice
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="shippingCondition"
                                                value="On Dry Ice"
                                                checked={sample.shippingCondition === 'On Dry Ice'}
                                                onChange={handleChange}
                                            /> On Dry Ice
                                        </label>
                                    </div>
                                </div>

                                <div className={`${styles.info} ${styles.conditionColumn}`}>
                                    <div className={styles.columnHeader}>Sample Storage Condition</div>
                                    <div className={styles.radioGroup}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleStorage"
                                                value="Room Temperature"
                                                checked={sample.sampleStorage === 'Room Temperature'}
                                                onChange={handleChange}
                                            /> Room Temperature
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleStorage"
                                                value="Refrigerated"
                                                checked={sample.sampleStorage === 'Refrigerated'}
                                                onChange={handleChange}
                                            /> Refrigerated
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleStorage"
                                                value="Freezer -10°C to -25°C"
                                                checked={sample.sampleStorage === 'Freezer -10°C to -25°C'}
                                                onChange={handleChange}
                                            /> Freezer -10°C to -25°C
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleStorage"
                                                value="Freezer ≤ -70°C"
                                                checked={sample.sampleStorage === 'Freezer ≤ -70°C'}
                                                onChange={handleChange}
                                            /> Freezer ≤ -70°C
                                        </label>
                                    </div>
                                </div>

                                <div className={`${styles.info} ${styles.conditionColumn}`}>
                                    <div className={styles.columnHeader}>Sample Disposition</div>
                                    <div className={styles.radioGroup}>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleDisposition"
                                                value="Discard"
                                                checked={sample.sampleDisposition === 'Discard'}
                                                onChange={handleChange}
                                            /> Discard
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleDisposition"
                                                value="Return Unused Samples"
                                                checked={sample.sampleDisposition === 'Return Unused Samples'}
                                                onChange={handleChange}
                                            /> Return Unused Samples
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="sampleDisposition"
                                                value="Return All Samples"
                                                checked={sample.sampleDisposition === 'Return All Samples'}
                                                onChange={handleChange}
                                            /> Return All Samples
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.details2}>
                                <div className={styles.info2} style={{ width: '100%' }}>
                                    <div className={styles.infoDetail}>Safety Precautions</div>
                                    <textarea
                                        name="safetyPrecautions"
                                        value={sample.safetyPrecautions}
                                        onChange={handleChange}
                                        className={styles.autoGrowInput}
                                        rows={1}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </WhiteIsland>

                {/* Sample Images WhiteIsland */}
                <WhiteIsland className={styles.bigIsland}>
                    <h3 className={styles.imageHeader}>
                        Sample Images

                    </h3>
                    <div className={styles.main}>
                        <div className={styles.detailContainer}>
                            <div className={`${styles.details} ${styles.imageContainer}`}>
                                <div className={styles.imageBox}>
                                    <div className={styles.imageFrame}>
                                        {sample.sampleImages.general ? (
                                            <img
                                                src={sample.sampleImages.general}
                                                alt="General Sample"
                                                className={styles.sampleImage}
                                                onClick={handleImageClick('general')}
                                            />
                                        ) : (
                                            <div className={styles.placeholderText}>General Image</div>
                                        )}
                                        <label className={styles.imageUploadButton}>
                                            <FaImage />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={(e) => handleSampleImageChange('general', e)}
                                            />
                                        </label>
                                    </div>
                                    <div className={styles.imageLabel}>General</div>
                                </div>

                                <div className={styles.imageBox}>
                                    <div className={styles.imageFrame}>
                                        {sample.sampleImages.labeling ? (
                                            <img
                                                src={sample.sampleImages.labeling}
                                                alt="Labeling"
                                                className={styles.sampleImage}
                                                onClick={handleImageClick('labeling')}
                                            />
                                        ) : (
                                            <div className={styles.placeholderText}>Labeling Image</div>
                                        )}
                                        <label className={styles.imageUploadButton}>
                                            <FaImage />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                style={{ display: "none" }}
                                                onChange={(e) => handleSampleImageChange('labeling', e)}
                                            />
                                        </label>
                                    </div>
                                    <div className={styles.imageLabel}>Labeling</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </WhiteIsland>

            </div>
            {/* Requested Tests WhiteIsland */}
            <WhiteIsland className={styles.bigIsland}>
                <div className={styles.header}>
                    <h3 style={{ border: "none" }}>Requested Tests</h3>
                    <button className={styles.addButton} onClick={handleAddTest}>
                        + Add
                    </button>
                </div>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        <div className={styles.testsTable}>
                            <table className={styles.requestedTestsTable}>
                                <thead>
                                    <tr>
                                        <th className={styles.codeColumn}>GRK Code</th>
                                        <th className={styles.descriptionColumn}>Description</th>
                                        <th className={styles.centerColumn}>Samples Submitted</th>
                                        <th>Extraction Condition</th>
                                        <th>Quality</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tests.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                                                No tests added. Click "+ Add" to add tests.
                                            </td>
                                        </tr>
                                    ) : (
                                        tests.map((test) => (
                                            <tr key={test.id}>
                                                <td>{test.grkCode}</td>
                                                <td>{test.description}</td>
                                                <td className={styles.centerAlign}>
                                                    <input 
                                                        type="text" 
                                                        value={test.samplesSubmitted}
                                                        onChange={(e) => handleTestChange(test.id, 'samplesSubmitted', e.target.value)}
                                                        className={styles.extractionInput}
                                                        style={{ width: '60px', textAlign: 'center' }}
                                                    />
                                                </td>
                                                <td>
                                                    <div className={styles.extractionParams}>
                                                        <div>
                                                            Time (h):
                                                            <input type="text" value={test.extractionTime}
                                                                onChange={(e) => handleTestChange(test.id, 'extractionTime', e.target.value)}
                                                                className={styles.extractionInput}
                                                            />
                                                        </div>
                                                        <div>
                                                            Temp (C):
                                                            <input
                                                                type="text"
                                                                value={test.extractionTemp}
                                                                onChange={(e) => handleTestChange(test.id, 'extractionTemp', e.target.value)}
                                                                className={styles.extractionInput}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.qualityOptions}>
                                                        <label>
                                                            <input
                                                                type="radio"
                                                                name={`quality_${test.id}`}
                                                                value="GLP"
                                                                checked={test.quality === 'GLP'}
                                                                onChange={() => handleTestChange(test.id, 'quality', 'GLP')}
                                                            />
                                                            GLP
                                                        </label>
                                                        <label>
                                                            <input
                                                                type="radio"
                                                                name={`quality_${test.id}`}
                                                                value="Non-GLP"
                                                                checked={test.quality === 'Non-GLP'}
                                                                onChange={() => handleTestChange(test.id, 'quality', 'Non-GLP')}
                                                            />
                                                            Non-GLP
                                                        </label>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRemoveTest(test.id)}
                                                        style={{ 
                                                            marginTop: '5px', 
                                                            padding: '2px 8px', 
                                                            fontSize: '12px',
                                                            background: '#dc2626',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '3px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.testsSummary}>
                            {/* <div className={styles.sampleCount}>
                                <span>Total Samples Submitted:</span>
                                <span className={styles.countDisplay}>{testMetadata.totalSamplesSubmitted}</span>
                                <button className={styles.generateButton}>Generate Instances</button>
                            </div> */}

                            <div className={styles.serviceLevel}>
                                <span>Level of Service:</span>
                                <div className={styles.serviceLevelOptions}>
                                    <label>
                                        <input
                                            type="radio"
                                            name="serviceLevel"
                                            value="Standard"
                                            checked={testMetadata.serviceLevel === 'Standard'}
                                            onChange={handleTestMetadataChange}
                                        />
                                        Standard
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name="serviceLevel"
                                            value="Expedited"
                                            checked={testMetadata.serviceLevel === 'Expedited'}
                                            onChange={handleTestMetadataChange}
                                        />
                                        Expedited
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className={styles.notesSection}>
                            <div className={styles.infoDetail}>Notes and/or Specific Requirements:</div>
                            <textarea
                                name="notes"
                                value={testMetadata.notes}
                                onChange={handleTestMetadataChange}
                                className={styles.autoGrowInput}
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
            </WhiteIsland>


            {/* Submission Approval WhiteIsland */}
            {/* NOTE : data for this section is not being saved in the object-sample. The input fields just have a default value  */}
            <WhiteIsland className={`${styles.bigIsland} ${styles.approvalIsland}`}>
                <h3>Submission Approval</h3>
                <div className={styles.main}>
                    <div className={styles.detailContainer}>
                        <div className={styles.approvalSection}>
                            <div className={styles.approvalRow}>
                                <div className={styles.approvalLabel}>Groenakker Acceptance: </div>
                                <div className={styles.approvalName}>
                                    <input className={styles.mainText} defaultValue="Michael R Groendyk" />
                                    <div className={styles.subText}>Name</div>
                                </div>
                                <div className={styles.approvalSignature}>
                                    <SignatureCanvas
                                        ref={sigCanvas}
                                        canvasProps={{
                                            className: styles.signatureCanvas
                                        }}
                                        backgroundColor="#f0f0f0"
                                    />
                                    <div className={styles.signatureActions}>
                                        <button type="button" onClick={clearSignature} className={styles.smallBtn}>Clear</button>
                                        <button type="button" onClick={saveSignature} className={styles.smallBtn}>Save</button>
                                    </div>
                                    <div className={styles.subText}>Signature</div>
                                </div>
                                <div className={styles.approvalDate}>
                                    <input className={styles.mainText} defaultValue='9 Jan 2025'></input>
                                    <div className={styles.subText}>Date</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </WhiteIsland>
            <div className={styles.saves}>
                {id !== 'add' && (
                    <button className={styles.deleteButton} onClick={handleDelete}><FaTrash />Delete</button>
                )}
                <button className={styles.saveButton} onClick={handleSave}><FaSave />Save</button>
            </div>




            {/* Fullscreen Image Modal */}
            {viewingImage && (
                <Modal onClose={() => setViewingImage(null)}>
                    <div className={styles.fullScreenImageContainer}>
                        <img
                            src={viewingImage.src}
                            alt={viewingImage.alt}
                            className={styles.fullScreenImage}
                        />
                    </div>
                </Modal>
            )}

            {/* Test Code Selection Modal */}
            {showTestCodeModal && (
                <Modal onClose={() => setShowTestCodeModal(false)}>
                    <TestCodeChecklist 
                        onClose={() => setShowTestCodeModal(false)}
                        onTestSelected={handleTestSelected}
                    />
                </Modal>
            )}

        </div>
    );
}