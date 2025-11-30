import './SignupForm.css'; 
import { FaGoogle, FaFacebook } from 'react-icons/fa';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import fullLogo from '../LoginPage/CompanyLogoFull.png';

function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [formError, setFormError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value,
    }));
    if (formError) {
      setFormError('');
    }
    
    // Reset OTP verification if email changes after OTP is sent
    if (id === 'email' && otpSent) {
      setOtpSent(false);
      setEmailVerified(false);
      setOtp('');
      setOtpError('');
    }
  };

  const handleSendOTP = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setOtpError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.message || 'Failed to send OTP');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setOtpSent(true);
      alert(`OTP sent to ${formData.email}`);
    } catch (error) {
      console.error('Error sending OTP:', error);
      setOtpError('Failed to send OTP. Please try again.');
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: formData.email,
          otp: otp 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOtpError(data.message || 'Invalid OTP. Please try again.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      setEmailVerified(true);
      setOtpError('');
      alert('Email verified successfully!');
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setOtpError('Failed to verify OTP. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!emailVerified) {
      setOtpError('Please verify your email before submitting');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setOtpError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    setFormError('');

    const result = await signup({
      name: formData.name,
      companyName: formData.companyName,
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      navigate('/');
    } else {
      setFormError(result.message || 'Signup failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
    <div className='wrapper'>
      <div className="signup-card">
        <h1 className="welcome-back">Create Account</h1>
        <p className="motivational-text">
          Today is a new day. It's your day. You shape it.<br />
          Sign up to start managing your projects.
        </p>
        
        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input 
              type="text" 
              id="name" 
              placeholder="Enter your name" 
              value={formData.name}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="companyName">Company Name</label>
            <input 
              type="text" 
              id="companyName" 
              placeholder="Enter your company name" 
              value={formData.companyName}
              onChange={handleInputChange}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="Example@email.com" 
              value={formData.email}
              onChange={handleInputChange}
              required 
              disabled={emailVerified}
            />
            {emailVerified && (
              <span className="verified-badge">✓ Verified</span>
            )}
          </div>

          {/* OTP Verification Section */}
          {formData.email && !emailVerified && (
            <div className="otp-section">
              {!otpSent ? (
                <button 
                  type="button" 
                  className="send-otp-button"
                  onClick={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send OTP to Verify Email'}
                </button>
              ) : (
                <div className="otp-input-group">
                  <label htmlFor="otp">Enter OTP</label>
                  <div className="otp-input-wrapper">
                    <input 
                      type="text" 
                      id="otp" 
                      placeholder="Enter OTP" 
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(value);
                        setOtpError('');
                      }}
                      maxLength="6"
                      className="otp-input"
                    />
                    <button 
                      type="button" 
                      className="verify-otp-button"
                      onClick={handleVerifyOTP}
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                  <button 
                    type="button" 
                    className="resend-otp-link"
                    onClick={handleSendOTP}
                    disabled={isLoading}
                  >
                    Resend OTP
                  </button>
                </div>
              )}
              {otpError && (
                <span className="error-message">{otpError}</span>
              )}
            </div>
          )}
          
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
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              placeholder="Confirm your password" 
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required 
              minLength="8"
            />
          </div>
          
          <button 
            type="submit" 
            className="signup-button"
            disabled={!emailVerified || isLoading}
          >
            {isLoading ? 'Processing...' : emailVerified ? 'Sign up' : 'Verify Email to Continue'}
          </button>
          {formError && (
            <span className="error-message" style={{ marginTop: '12px' }}>
              {formError}
            </span>
          )}
        </form>
        
        <div className="divider">
          <span>Or</span>
        </div>
        
        <div className="social-login">
          <button className="social-button google">
          <FaGoogle style={{marginRight: '10px'}} />
            Sign up with Google
          </button>
          {/* <button className="social-button facebook">
          <FaFacebook style={{marginRight: '10px'}} />
            Sign up with Facebook
          </button> */}
        </div>
        
        <div className="signup-link">
          Already have an account? <a href="/login">Sign in</a>
        </div>

       
      </div>
      
      <div className="signup-image-container">
        <img 
          src={fullLogo} 
          alt="Background" 
          className="signup-image"
          style={{ width: '550px', height: 'auto'}} 
          
        />
      </div>
     </div>
    </div>
  );
};

export default SignUp;
