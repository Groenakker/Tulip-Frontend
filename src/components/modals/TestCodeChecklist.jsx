import { useState, useEffect } from 'react';
import styles from './TestCodeChecklist.module.css';
import { FaSearch } from 'react-icons/fa';
import toast from 'react-hot-toast';

const TestCodesChecklist = ({ onClose, onTestSelected, bPartnerID, onSaved, existingTestCodes = [] }) => {
  //State for tracking every test code selected
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [testCodeOptions, setTestCodeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch test codes from backend and pre-select existing ones
  useEffect(() => {
    const fetchTestCodes = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/testcodes`);
        if (!res.ok) throw new Error('Failed to fetch test codes');
        const data = await res.json();
        setTestCodeOptions(data);
        
        // Pre-select test codes that are already associated with the business partner
        if (existingTestCodes && existingTestCodes.length > 0) {
          const existingIds = existingTestCodes.map(tc => {
            // Handle both populated objects and references
            const testCode = tc.testCodeId || tc;
            return testCode._id || tc.testCodeId || tc._id;
          }).filter(Boolean); // Remove any undefined/null values
          
          setSelectedCodes(existingIds);
        }
      } catch (error) {
        console.error('Error fetching test codes:', error);
        toast.error('Failed to load test codes');
      } finally {
        setLoading(false);
      }
    };
    fetchTestCodes();
  }, [existingTestCodes]);

  const handleCheckboxChange = (id) => {
    setSelectedCodes(prev =>
      prev.includes(id)
        ? prev.filter(code => code !== id)
        : [...prev, id]
    );
  };

  // Save to commit saved data to DB
  const handleSave = async () => {
    const selectedTests = testCodeOptions.filter(test => selectedCodes.includes(test._id));
    
    // If bPartnerID is provided, save to backend
    if (bPartnerID) {
      setSaving(true);
      try {
        // Get existing test code IDs to determine what to add/remove
        const existingIds = (existingTestCodes || []).map(tc => {
          const testCode = tc.testCodeId || tc;
          return testCode._id || tc.testCodeId || tc._id;
        }).filter(Boolean);
        
        const selectedIds = selectedTests.map(test => test._id);
        
        // Find test codes to add (selected but not existing)
        const toAdd = selectedIds.filter(id => !existingIds.includes(id));
        
        // Find test codes to remove (existing but not selected)
        const toRemove = existingIds.filter(id => !selectedIds.includes(id));
        
        // Add new test codes
        const addPromises = toAdd.map(testId => 
          fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/testcodes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ testCodeId: testId }),
          })
        );
        
        // Remove unselected test codes
        const removePromises = toRemove.map(testId => {
          // Find the relationship object - the relationship has its own _id
          const relationship = existingTestCodes.find(tc => {
            const testCode = tc.testCodeId || tc;
            const id = testCode._id || tc.testCodeId || tc._id;
            return id === testId;
          });
          // Use the relationship's _id (not the test code's _id) for deletion
          const relationshipId = relationship?._id;
          
          if (!relationshipId) {
            console.warn(`Could not find relationship ID for test code ${testId}`);
            return Promise.resolve(); // Skip if relationship ID not found
          }
          
          return fetch(`${import.meta.env.VITE_BACKEND_URL}/api/bpartners/${bPartnerID}/testcodes/${relationshipId}`, {
            method: 'DELETE',
          });
        });
        
        await Promise.all([...addPromises, ...removePromises]);
        toast.success('Test codes updated successfully');
        onSaved?.();
        onClose();
      } catch (error) {
        console.error('Error saving test codes:', error);
        toast.error('Failed to save test codes');
      } finally {
        setSaving(false);
      }
    } else {
      // Legacy callback support
      if (onTestSelected) {
        onTestSelected(selectedTests);
      }
      onClose();
    }
  };

  // Filter test codes based on search term
  const filteredTestCodes = testCodeOptions.filter(test => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (test.code || '').toLowerCase().includes(searchLower) ||
      (test.descriptionShort || '').toLowerCase().includes(searchLower) ||
      (test.descriptionLong || '').toLowerCase().includes(searchLower) ||
      (test.category || '').toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Select Test Codes</h3>

      
      {/* SEARCHBARR  */}
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search test codes, descriptions, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>


      {/* List of test codes */}
      <div className={styles.list}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>Loading test codes...</div>
        ) : filteredTestCodes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            {searchTerm ? 'No test codes found matching your search' : 'No test codes available'}
          </div>
        ) : (
          filteredTestCodes.map(option => (
            <label
              key={option._id}
              className={`${styles.optionCard} ${selectedCodes.includes(option._id) ? styles.selected : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedCodes.includes(option._id)}
                onChange={() => handleCheckboxChange(option._id)}
                className={styles.checkbox}
              />
              <div className={styles.optionContent}>
                <div className={styles.grkCode}>{option.code || 'N/A'}</div>
                <div className={styles.description}>
                  {option.descriptionLong || option.descriptionShort || 'No description'}
                </div>
                <div className={styles.meta}>
                  {option.category && <span><strong>Category:</strong> {option.category}</span>}
                  {option.extractBased && <span><strong>Extract Based:</strong> {option.extractBased}</span>}
                  {option.standard && <span><strong>Standard:</strong> {option.standard}</span>}
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      <div className={styles.actions}>
        <button onClick={handleSave} className={styles.saveBtn} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={onClose} className={styles.cancelBtn} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
};

export default TestCodesChecklist;