import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { authService } from '@/services/authService';

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    emailid: '',
    password: '',
  });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(forgotEmail);
      setForgotPasswordStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.validateResetOtp(forgotEmail, otp);
      setForgotPasswordStep(3);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(forgotEmail, newPassword);
      setForgotPasswordOpen(false);
      resetForgotPasswordState();
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const resetForgotPasswordState = () => {
    setForgotPasswordStep(1);
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleDialogClose = (open) => {
    setForgotPasswordOpen(open);
    if (!open) {
      resetForgotPasswordState();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left side - Login Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-md mx-auto w-full"
            >
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-2xl text-center">
                    Welcome back to{' '}
                    <span className="gradient-primary bg-clip-text text-transparent">
                      Homely Taste
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="emailid">Email</Label>
                      <Input
                        id="emailid"
                        type="email"
                        value={formData.emailid}
                        onChange={handleInputChange}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 shadow-warm"
                      disabled={loading}
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto font-semibold"
                      onClick={() => setForgotPasswordOpen(true)}
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Right side - Sign Up Call to Action */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center space-y-6 p-8 max-w-md mx-auto w-full"
            >
              <h2 className="text-3xl font-bold">New to Homely Taste?</h2>
              <p className="text-muted-foreground text-lg">
                Join our community and discover the authentic taste of homemade
                pickles.
              </p>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 shadow-warm"
                >
                  Create an Account
                </Button>
              </Link>
              <div className="space-y-4 mt-8">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-left text-sm">Quick and easy sign-up process</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <p className="text-left text-sm">Track your orders and favorites</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {forgotPasswordStep === 1
                ? 'Forgot Password'
                : forgotPasswordStep === 2
                ? 'Enter OTP'
                : 'Reset Password'}
            </DialogTitle>
            <DialogDescription>
              {forgotPasswordStep === 1
                ? 'Enter your email to receive a verification code'
                : forgotPasswordStep === 2
                ? 'Enter the OTP sent to your email'
                : 'Enter your new password'}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {forgotPasswordStep === 1 && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail">Email</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending...' : 'Send OTP'}
              </Button>
            </form>
          )}
          {forgotPasswordStep === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
            </form>
          )}
          {forgotPasswordStep === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}