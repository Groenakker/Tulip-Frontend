
import './LoginForm.css'; 
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import fullLogo from './CompanyLogoFull.png';

function SignIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="signin-container">
    <div className='wrapper'>
      <div className="signin-card">
        <h1 className="welcome-back">Welcome Back</h1>
        <p className="motivational-text">
          Today is a new day. It's your day. You shape it.<br />
          Sign in to start managing your projects.
        </p>
        
        <form className="signin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="Example@email.com" 
              value={formData.email}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              placeholder="At least 8 characters" 
              value={formData.password}
              onChange={handleInputChange}
              required 
              minLength="8"
            />
          </div>
          
          {error && (
            <span className="error-message">{error}</span>
          )}
          
          <a href="/forgot-password" className="forgot-password">Forgot Password?</a>
          
          <button 
            type="submit" 
            className="signin-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        <div className="divider">
          <span>Or</span>
        </div>
        
        <div className="social-login">
          <button className="social-button google">
          <FaGoogle style={{marginRight: '10px'}} />
            Sign in with Google
          </button>
          {/* <button className="social-button facebook">
          <FaFacebook style={{marginRight: '10px'}} />
            Sign in with Facebook
          </button> */}
        </div>
        
        <div className="signup-link">
          Don't you have an account? <a href="/signup">Sign up</a>
        </div>

       
      </div>
      
      <div className="signin-image-container">
        <img 
          src={fullLogo} 
          alt="Background" 
          className="signin-image"
          style={{ width: '550px', height: 'auto'}} 
          
        />
      </div>
     </div>
    </div>
  );
};

export default SignIn;