import React, { useState, useEffect, useRef } from 'react';
import WhiteIsland from '../../../components/Whiteisland';
import styles from './SSDetails.module.css';
import { FaSave, FaTrash, FaImage, FaEdit, } from "react-icons/fa";
import Modal from '../../../components/Modal';
import SignatureCanvas from 'react-signature-canvas';
import toast from '../../../components/Toaster/toast';
import TestCodeChecklist from '../../../components/modals/TestCodeChecklist';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

export default function SSDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEdit = Boolean(id && id !== 'add');

    //image modal
    const [viewingImage, setViewingImage] = useState(null);
    const [showTestCodeModal, setShowTestCodeModal] = useState(false);

    // Contact type options - default options + custom values from localStorage
    const getContactTypeOptions = () => {
        const defaultOptions = ['Tissue / Bone', 'Blood', 'Skin'];
        const storedOptions = localStorage.getItem('contactTypeOptions');
        if (storedOptions) {
            try {
                const parsed = JSON.parse(storedOptions);
                // Merge and remove duplicates
                return [...new Set([...defaultOptions, ...parsed])];
            } catch (e) {
                return defaultOptions;
            }
        }
        return defaultOptions;
    };

    const [contactTypeOptions, setContactTypeOptions] = useState(getContactTypeOptions());
    const [showContactTypeDropdown, setShowContactTypeDropdown] = useState(false);
    const contactTypeInputRef = useRef(null);
    const contactTypeDropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                contactTypeDropdownRef.current &&
                !contactTypeDropdownRef.current.contains(event.target) &&
                contactTypeInputRef.current &&
                !contactTypeInputRef.current.contains(event.target)
            ) {
                setShowContactTypeDropdown(false);
            }
        };

        if (showContactTypeDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showContactTypeDropdown]);

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

    // Partners and Projects state
    const [partners, setPartners] = useState([]);
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);

    //Sample info data
    const [sample, setSample] = useState({
        company_id: user?.companyId || '',
        bPartnerCode: '',
        bPartnerID: '',
        projectID: '',
        projectName: '',
        status: '',
        bPartnerName: '',
        address: '',
        contactName: '',
        email: '',
        phone: '',
        image: null,
        sampleCode: '',
        name: '',
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
        },
        
        // Additional fields from schema
        SAPid: '',
        poNumber: '',
        poDate: '',
        quoteNumber: '',
        salesOrderNumber: '',
        signatureImage: '',
        startDate: '',
        endDate: '',
        actDate: '',
        estDate: '',
        commitDate: ''
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

    // Handle partner code change
    const handlePartnerChange = async (e) => {
        const selectedCode = e.target.value;
        const selectedPartner = partners.find(p => p.partnerNumber === selectedCode);
        
        setSample(prev => ({
            ...prev,
            bPartnerCode: selectedCode,
            bPartnerID: selectedPartner ? selectedPartner._id : '',
            bPartnerName: selectedPartner ? selectedPartner.name : '',
            // Clear project when partner changes
            projectID: '',
            projectName: ''
        }));
    };

    // Handle project change
    const handleProjectChange = async (e) => {
        const selectedProjectId = e.target.value;
        const selectedProject = filteredProjects.find(p => 
            p._id === selectedProjectId || 
            p.projectID === selectedProjectId ||
            p.projectCode === selectedProjectId
        );
        
        if (selectedProject) {
            // Fetch partner details if bPartnerID exists
            let partnerData = null;
            if (selectedProject.bPartnerID) {
                try {
                    const partnerRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${selectedProject.bPartnerID}`);
                    if (partnerRes.ok) {
                        partnerData = await partnerRes.json();
                    }
                } catch (err) {
                    console.error('Failed to fetch partner:', err);
                }
            }
            
            // Build address from partner data
            let address = '';
            if (partnerData) {
                const addrParts = [
                    partnerData.address1,
                    partnerData.address2,
                    partnerData.city,
                    partnerData.state,
                    partnerData.zip,
                    partnerData.country
                ].filter(Boolean);
                address = addrParts.join(', ');
            }
            
            // Get contact/sponsor from project or partner
            let sponsor = '';
            if (selectedProject.contact) {
                sponsor = selectedProject.contact;
            } else if (partnerData?.contacts && partnerData.contacts.length > 0) {
                sponsor = partnerData.contacts[0].name || partnerData.contacts[0].email || '';
            }
            
            setSample(prev => ({
                ...prev,
                projectID: selectedProject._id || selectedProject.projectID || selectedProject.projectCode || '',
                projectName: selectedProject.description || selectedProject.name || '',
                bPartnerCode: selectedProject.bPartnerCode || (partnerData ? partnerData.partnerNumber : prev.bPartnerCode),
                bPartnerID: selectedProject.bPartnerID || (partnerData ? partnerData._id : prev.bPartnerID),
                bPartnerName: partnerData ? partnerData.name : prev.bPartnerName,
                address: address || prev.address,
                email: partnerData ? (partnerData.email || prev.email) : prev.email,
                phone: partnerData ? (partnerData.phone || prev.phone) : prev.phone,
                contactName: sponsor || prev.contactName
            }));
        } else {
            setSample(prev => ({
                ...prev,
                projectID: selectedProjectId,
                projectName: ''
            }));
        }
    };

    // Handle contact type change
    const handleContactTypeChange = (e) => {
        const value = e.target.value;
        setSample(prev => ({ ...prev, contactType: value }));
        setShowContactTypeDropdown(false);
    };

    // Handle contact type input change
    const handleContactTypeInputChange = (e) => {
        const value = e.target.value;
        setSample(prev => ({ ...prev, contactType: value }));
        setShowContactTypeDropdown(true);
    };

    // Filter options based on input
    const filteredContactTypeOptions = contactTypeOptions.filter(option =>
        option.toLowerCase().includes((sample.contactType || '').toLowerCase())
    );

    const handleSave = async () => {
        try {
            // If contactType has a custom value not in options, add it to options
            if (sample.contactType && !contactTypeOptions.includes(sample.contactType)) {
                const updatedOptions = [...contactTypeOptions, sample.contactType];
                setContactTypeOptions(updatedOptions);
                // Store in localStorage for persistence
                const customOptions = updatedOptions.filter(opt => 
                    !['Tissue / Bone', 'Blood', 'Skin'].includes(opt)
                );
                localStorage.setItem('contactTypeOptions', JSON.stringify(customOptions));
            }

            const payload = {
                ...sample,
                company_id: sample.company_id || user?.companyId || '',
                status: sample.status || 'Draft',
                description: sample.sampleDescription,
                name: sample.name || sample.sampleDescription || '',
                signatureImage: sample.signatureImage || signatureData.signature || '',
                requestedTests: tests.filter(t => t.grkCode || t.description), // Only save tests with data
                testMetadata: testMetadata
            };
            
            if (isEdit) {
                // Update existing sample (PUT)
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!res.ok) throw new Error('Failed to save');
                toast.success('Sample saved!');
            } else {
                // Create new sample (POST)
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/samples`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!res.ok) throw new Error('Failed to save');
                
                const saved = await res.json();
                toast.success('Sample saved!');
                
                // Navigate to the saved sample's ID
                if (saved._id) {
                    navigate(`/SampleSubmission/SSDetail/${saved._id}`, { replace: true });
                }
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

    // Fetch partners for user's company
    useEffect(() => {
        const fetchPartners = async () => {
            if (!user?.companyId) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners?companyId=${user.companyId}`);
                if (res.ok) {
                    const data = await res.json();
                    setPartners(data);
                }
            } catch (err) {
                console.error('Failed to fetch partners:', err);
            }
        };
        fetchPartners();
    }, [user?.companyId]);

    // Fetch projects for user's company
    useEffect(() => {
        const fetchProjects = async () => {
            if (!user?.companyId) return;
            try {
                const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/projects?companyId=${user.companyId}`);
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data);
                    setFilteredProjects(data); // Initially show all projects
                }
            } catch (err) {
                console.error('Failed to fetch projects:', err);
            }
        };
        fetchProjects();
    }, [user?.companyId]);

    // Filter projects based on selected partner
    useEffect(() => {
        if (sample.bPartnerCode) {
            const selectedPartner = partners.find(p => p.partnerNumber === sample.bPartnerCode);
            if (selectedPartner) {
                const filtered = projects.filter(p => 
                    p.bPartnerID === selectedPartner._id || 
                    p.bPartnerCode === selectedPartner.partnerNumber
                );
                setFilteredProjects(filtered);
            } else {
                setFilteredProjects([]);
            }
        } else {
            // Show all projects when partner is empty
            setFilteredProjects(projects);
        }
    }, [sample.bPartnerCode, partners, projects]);

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
                            company_id: formData.company_id || data.company_id || data.companyId || user?.companyId || '',
                            bPartnerCode: formData.bPartnerCode || data.bPartnerCode || '',
                            bPartnerID: formData.bPartnerID || data.bPartnerID || '',
                            projectID: formData.projectID || data.projectID || '',
                            status: data.status || formData.status || 'Draft',
                            bPartnerName: formData.bPartnerName || data.bPartnerName || '',
                            sampleCode: formData.sampleCode || data.sampleCode || '',
                            name: formData.name || data.name || '',
                            sampleDescription: data.description || formData.sampleDescription || '',
                            image: data.image || formData.image || null,
                            sampleImages: formData.sampleImages || data.sampleImages || { general: null, labeling: null },
                            SAPid: formData.SAPid || data.SAPid || '',
                            poNumber: formData.poNumber || data.poNumber || '',
                            poDate: formData.poDate || data.poDate || '',
                            quoteNumber: formData.quoteNumber || data.quoteNumber || '',
                            salesOrderNumber: formData.salesOrderNumber || data.salesOrderNumber || '',
                            signatureImage: formData.signatureImage || data.signatureImage || '',
                            startDate: formData.startDate || data.startDate || '',
                            endDate: formData.endDate || data.endDate || '',
                            actDate: formData.actDate || data.actDate || '',
                            estDate: formData.estDate || data.estDate || '',
                            commitDate: formData.commitDate || data.commitDate || ''
                        };
                        
                        // Load contact type options and add loaded contactType if it's custom
                        const loadedContactType = mergedData.contactType || '';
                        if (loadedContactType) {
                            const currentOptions = getContactTypeOptions();
                            if (!currentOptions.includes(loadedContactType)) {
                                const updatedOptions = [...currentOptions, loadedContactType];
                                setContactTypeOptions(updatedOptions);
                                // Store in localStorage
                                const customOptions = updatedOptions.filter(opt => 
                                    !['Tissue / Bone', 'Blood', 'Skin'].includes(opt)
                                );
                                localStorage.setItem('contactTypeOptions', JSON.stringify(customOptions));
                            } else {
                                setContactTypeOptions(currentOptions);
                            }
                        } else {
                            setContactTypeOptions(getContactTypeOptions());
                        }
                        
                        // Set sample state with defaults for missing fields
                        setSample(prev => ({
                            company_id: user?.companyId || '',
                            bPartnerCode: '',
                            bPartnerID: '',
                            projectID: '',
                            projectName: '',
                            status: 'Draft',
                            bPartnerName: '',
                            address: '',
                            contactName: '',
                            email: '',
                            phone: '',
                            image: null,
                            sampleCode: '',
                            name: '',
                            sampleDescription: '',
                            intendedUse: '',
                            partNumber: '',
                            lotNumber: '', 
                            devicesUsed: '1',
                            countryOrigin: '',
                            sampleMass: '',
                            surfaceArea: '',
                            contactType: loadedContactType || '',
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
                            SAPid: '',
                            poNumber: '',
                            poDate: '',
                            quoteNumber: '',
                            salesOrderNumber: '',
                            signatureImage: '',
                            startDate: '',
                            endDate: '',
                            actDate: '',
                            estDate: '',
                            commitDate: '',
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
                        company_id: user?.companyId || '',
                        bPartnerCode: '',
                        bPartnerID: '',
                        projectID: '',
                        projectName: '',
                        status: 'Draft',
                        bPartnerName: '',
                        address: '',
                        contactName: '',
                        email: '',
                        phone: '',
                        image: null,
                        sampleCode: '',
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
        setSample(prev => ({ ...prev, signatureImage: '' }));
    }

    //saving signature
    const saveSignature = () => {
        if (sigCanvas.current.isEmpty()) {
            toast.error("Please provide a signature first.");
            return;
        }
        const dataURL = sigCanvas.current.toDataURL('image/png');
        setSignatureData({ signature: dataURL });
        setSample(prev => ({ ...prev, signatureImage: dataURL }));
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
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Partner Code <span style={{ color: "red" }}>*</span></div>
                                    <select 
                                        className={styles.dropdown}
                                        name="bPartnerCode" 
                                        value={sample.bPartnerCode} 
                                        onChange={handlePartnerChange}
                                    >
                                        <option value="">Select Partner</option>
                                        {partners.map(partner => (
                                            <option key={partner._id} value={partner.partnerNumber}>
                                                {partner.partnerNumber} - {partner.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Project <span style={{ color: "red" }}>*</span></div>
                                    <select 
                                        className={styles.dropdown}
                                        name="projectID" 
                                        value={sample.projectID} 
                                        onChange={handleProjectChange}
                                    >
                                        <option value="">Select Project</option>
                                        {filteredProjects.map(project => (
                                            <option key={project._id} value={project._id || project.projectID || project.projectCode}>
                                                {project.projectID || project.projectCode} - {project.description || project.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.info} style={{ width: '33%' }}>
                                    <div className={styles.infoDetail}>Form Status</div>
                                    <select className={styles.dropdown} name="status" value={sample.status} onChange={handleChange}>
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
                    <h3>Sample Information for : {sample.sampleCode || '(unsaved)'}</h3>
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
                                    <div className={styles.customDropdownContainer}>
                                        <input
                                            ref={contactTypeInputRef}
                                            type="text"
                                            className={styles.dropdown}
                                            name="contactType"
                                            value={sample.contactType}
                                            onChange={handleContactTypeInputChange}
                                            onFocus={() => setShowContactTypeDropdown(true)}
                                            placeholder="Select or type custom value"
                                            style={{
                                                backgroundColor: '#ffffff',
                                                background: '#ffffff',
                                                color: '#000000',
                                                WebkitAppearance: 'none',
                                                MozAppearance: 'none',
                                                appearance: 'none'
                                            }}
                                        />
                                        {showContactTypeDropdown && filteredContactTypeOptions.length > 0 && (
                                            <div 
                                                ref={contactTypeDropdownRef}
                                                className={styles.customDropdownList}
                                            >
                                                {filteredContactTypeOptions.map((option, index) => (
                                                    <button
                                                        key={index}
                                                        type="button"
                                                        className={styles.customDropdownOption}
                                                        onClick={() => {
                                                            setSample(prev => ({ ...prev, contactType: option }));
                                                            setShowContactTypeDropdown(false);
                                                        }}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
                                                <td className={styles.centerAlign} style={{ textAlign: 'left' }}>
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
                                    <input className={styles.mainText} defaultValue='' />
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