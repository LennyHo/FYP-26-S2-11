'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef } from 'react';
import styles from './login.module.css';
import BackgroundShapes from './BackgroundShapes';
// done by "HDC" - minimal backend login bridge for testing MongoDB auth routes.
import { useRouter } from 'next/navigation';
import { useState } from 'react';
// end done by "HDC"

const mainLogoSvg = `
<svg width="708" height="400" viewBox="0 0 708 400" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<path d="M381.468 131.207C410.669 105.311 363.677 70.7046 360.624 10.8213C360.526 8.89642 358.018 8.0941 356.888 9.65518C323.14 56.2615 317.166 81.4181 317.942 104.288C318.744 127.944 343.754 164.652 381.468 131.207Z" fill="url(#paint0_linear_33_1157)"/>
<path d="M520.823 300.14C524.52 283.689 525.507 252.192 523.426 228.74C522.432 217.528 514.408 208.521 503.678 205.119C348.832 156.017 227.458 196.919 209.991 210.882C191.884 225.356 200.937 239.83 200.937 278.428C200.937 317.026 243.186 374.923 285.435 389.397C327.684 403.871 378.987 401.459 427.271 389.397C475.556 377.335 509.506 350.488 520.823 300.14Z" fill="#FAF5CA"/>
<path opacity="0.9" d="M326.309 336.665C316.159 321.546 280.627 334.001 264.131 342.119C250.793 330.902 204.849 331.41 183.544 333.066C183.544 333.066 189.361 363.147 225.285 383.3C234.29 388.352 296.298 381.065 318.795 374.251C341.293 367.437 338.996 355.563 326.309 336.665Z" fill="#0257AD"/>
<path opacity="0.9" d="M380.971 336.665C391.121 321.546 426.652 334.001 443.149 342.119C456.487 330.902 502.431 331.41 523.735 333.066C523.735 333.066 517.918 363.147 481.994 383.3C472.989 388.352 410.982 381.065 388.484 374.251C365.987 367.437 368.283 355.563 380.971 336.665Z" fill="#0257AD"/>
<path opacity="0.9" d="M294.995 317.155C287.993 300.387 251.235 305.869 233.731 310.706C222.91 297.163 178.302 288.94 157.35 286.522C157.35 286.522 157.35 317.155 188.38 343.757C196.158 350.426 257.6 355.043 280.673 352.625C303.747 350.206 303.747 338.114 294.995 317.155Z" fill="#F43B03"/>
<path opacity="0.9" d="M412.285 317.155C419.286 300.387 456.045 305.869 473.549 310.706C484.369 297.163 528.978 288.94 549.93 286.522C549.93 286.522 549.93 317.155 518.9 343.757C511.122 350.426 449.679 355.043 426.606 352.625C403.533 350.206 403.533 338.114 412.285 317.155Z" fill="#F43B03"/>
<path opacity="0.9" d="M263.929 306.574C271.746 287.096 247.101 273.028 233.802 268.429C230.545 267.175 218.874 271.153 213.446 273.299C213.446 273.299 175.991 258.42 161.335 254.632C161.335 254.632 156.983 229.726 150.198 222.151C145.855 229.456 131.696 246.516 130.394 259.502C128.774 275.646 158.567 296.607 172.508 306.416L172.734 306.574C186.576 316.314 254.158 330.922 263.929 306.574Z" fill="#0257AD"/>
<path opacity="0.9" d="M443.35 306.574C435.534 287.096 460.178 273.028 473.477 268.429C476.734 267.175 488.405 271.153 493.833 273.299C493.833 273.299 531.288 258.42 545.945 254.632C545.945 254.632 555.444 228.931 562.23 221.357C566.572 228.661 575.583 246.516 576.886 259.502C578.506 275.646 548.712 296.607 534.771 306.416L534.545 306.574C520.703 316.314 453.121 330.922 443.35 306.574Z" fill="#0257AD"/>
<path opacity="0.9" d="M506.218 223.242C506.218 223.242 482.38 201.489 423.573 191.158C434.807 176.659 462.083 163.633 487.761 155.577C513.44 147.522 546.341 191.826 550.353 198.271C554.365 204.715 574.426 226.464 561.587 242.575C551.316 255.463 547.143 268.889 546.341 273.991C546.341 273.991 509.428 311.045 506.218 223.242Z" fill="#F43B03"/>
<path opacity="0.9" d="M209.008 223.242C209.008 223.242 233.074 192.791 291.653 189.569C280.419 175.069 253.143 163.633 227.465 155.577C201.786 147.522 168.886 191.826 164.874 198.271C160.861 204.715 140.8 226.464 153.639 242.575C163.911 255.463 168.083 268.889 168.886 273.991C168.886 273.991 205.799 311.045 209.008 223.242Z" fill="#F43B03"/>
<path d="M394.169 248.376C432.116 245.025 483.175 246.787 487.624 226.931C494.135 221.345 478.652 202.629 400.527 195.926C302.871 187.548 247.67 205.984 228.138 220.647C208.607 235.309 277.349 248.376 318.673 248.376C341.862 248.376 353.696 284.932 334.165 302.278C321.541 313.49 334.165 333.698 353.696 335.793C373.227 337.888 387.178 319.036 376.018 302.278C364.857 285.521 346.736 252.566 394.169 248.376Z" fill="#0257AD"/>
<g opacity="0.9"><path d="M270.132 54.5512C278.885 35.3492 273.779 10.1829 270.132 0C252.625 0 239.494 19.6384 232.929 54.5512C227.677 82.4814 216.151 102.556 211.045 109.102C227.093 98.9194 261.378 73.7532 270.132 54.5512Z" fill="#0257AD"/><path d="M211.045 91.646C214.547 77.6809 206.668 42.1862 202.292 26.1846C176.031 39.2768 178.22 48.005 180.408 76.3716C182.159 99.0649 175.302 120.74 171.654 128.741C183.326 122.195 207.544 105.611 211.045 91.646Z" fill="#0257AD"/></g>
<g opacity="0.9"><path d="M437.148 54.5512C428.394 35.3492 433.501 10.1829 437.148 0C454.655 0 467.785 19.6384 474.35 54.5512C479.603 82.4814 491.128 102.556 496.234 109.102C480.186 98.9194 445.901 73.7532 437.148 54.5512Z" fill="#F64A18"/><path d="M496.234 91.646C492.733 77.6809 500.611 42.1862 504.988 26.1846C531.248 39.2768 529.06 48.005 526.872 76.3716C525.121 99.0649 531.978 120.74 535.625 128.741C523.954 122.195 499.736 105.611 496.234 91.646Z" fill="#F64A18"/></g>
<g opacity="0.9"><path d="M123.334 162.469C123.334 162.469 191.608 116.319 143.155 63.5757C133.612 71.6337 115.405 91.7054 118.929 107.528C122.453 123.351 123.334 150.749 123.334 162.469Z" fill="#0257AD"/><path d="M103.513 166.865C112.322 147.525 85.1593 125.109 70.4767 116.319C63.8696 128.772 53.2981 156.316 63.8696 166.865C74.441 177.413 81.4887 191.771 83.6911 197.631C86.6276 195.434 94.703 186.204 103.513 166.865Z" fill="#0257AD"/><path d="M77.0835 259.165C94.7025 234.552 72.6787 216.678 59.4644 210.817C27.75 210.817 6.60715 240.119 0 254.77C0 254.77 55.0596 289.932 77.0835 259.165Z" fill="#0257AD"/></g>
<g opacity="0.9"><path d="M583.946 162.469C583.946 162.469 515.672 116.319 564.124 63.5757C573.668 71.6337 591.874 91.7054 588.35 107.528C584.826 123.351 583.946 150.749 583.946 162.469Z" fill="#F64A18"/><path d="M603.767 166.865C594.957 147.525 622.12 125.109 636.803 116.319C643.41 128.772 653.981 156.316 643.41 166.865C632.839 177.413 625.791 191.771 623.588 197.631C620.652 195.434 612.577 186.204 603.767 166.865Z" fill="#F64A18"/><path d="M630.196 259.165C612.577 234.552 634.601 216.678 647.815 210.817C679.529 210.817 700.672 240.119 707.28 254.77C707.28 254.77 652.22 289.932 630.196 259.165Z" fill="#F64A18"/></g>
<path opacity="0.9" d="M93.7741 305.085L111.257 333.652C102.516 329.257 115.628 333.652 87.2179 349.034C64.4896 361.34 35.4964 349.767 23.8409 342.442C23.8409 342.442 63.1783 296.295 67.5492 300.69C71.0458 304.206 86.4894 305.085 93.7741 305.085Z" fill="#0257AD"/>
<path opacity="0.9" d="M613.505 305.085L596.022 333.652C604.764 329.257 591.651 333.652 620.062 349.034C642.79 361.34 671.783 349.767 683.439 342.442C683.439 342.442 644.101 296.295 639.73 300.69C636.234 304.206 620.79 305.085 613.505 305.085Z" fill="#F64A18"/>
<defs><linearGradient id="paint0_linear_33_1157" x1="354.434" y1="4.76819" x2="354.434" y2="144.635" gradientUnits="userSpaceOnUse"><stop stop-color="#F7572B"/></linearGradient></defs>
</svg>
`;

export default function LoginPage() {
  // done by "HDC" - stores backend auth result so test credentials can be used.
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // end done by "HDC"
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const testCredentials = {
    admin: { email: 'admin@driptea.com', password: 'Admin@123' },
    staff: { email: 'staff@driptea.com', password: 'Staff@123' },
    customer: { email: 'customer@driptea.com', password: 'Customer@123' },
  };

  const fillTestCredentials = (role) => {
    const creds = testCredentials[role];
    if (emailRef.current && passwordRef.current) {
      emailRef.current.value = creds.email;
      passwordRef.current.value = creds.password;
    }
  };

  // done by "HDC" - submit existing login form to backend without changing page design.
  const handleLogin = async (event) => {
    event.preventDefault();
    setStatusMessage('');
    setIsSubmitting(true);

    try {
      // done by "HDC" - login bridge follows teammates' backend port 5000.
      // const response = await fetch('http://localhost:4000/api/auth/login', {
      const response = await fetch('http://localhost:5000/api/auth/login', {
      // end done by "HDC"
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailRef.current?.value || '',
          password: passwordRef.current?.value || '',
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'Login failed.');
      }

      localStorage.setItem('dripTeaCurrentUser', JSON.stringify(payload.user));
      localStorage.setItem('dripTeaAuthToken', payload.token);
      window.dispatchEvent(new Event('authUpdated'));

      if (payload.user.role === 'user_admin') {
        router.push('/user-admin-dashboard');
      } else if (payload.user.role === 'store_staff') {
        router.push('/store-staff-dashboard');
      } else {
        router.push('/buy-driptea');
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };
  // end done by "HDC"

  return (
    <div className={styles.page}>
      <BackgroundShapes />
      <div className={styles.shell}>
        <section className={styles.card}>
          <div className={styles.copyPanel}>
            <div className={styles.brandTop}>
              <div className={styles.brandMark}>
                <span className={styles.logoFrame} dangerouslySetInnerHTML={{ __html: mainLogoSvg }} />
              </div>
              <h1 className={styles.title}>Hello!</h1>
            </div>

            <div className={styles.heroCopy}>
              <p className={styles.subtitle}>
                Sign in to keep your tea orders, favorites, and usual blends close.
              </p>
            </div>

            <form className={styles.form} autoComplete="off" onSubmit={handleLogin}>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  ref={emailRef}
                  type="email"
                  id="email"
                  name="email"
                  required
                  className={styles.input}
                  placeholder="username@gmail.com"
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>Password</label>
                <input
                  ref={passwordRef}
                  type="password"
                  id="password"
                  name="password"
                  required
                  className={styles.input}
                  placeholder="Password"
                />
              </div>

              <div className={styles.actionsRow}>
                <button type="button" className={styles.forgot}>Forgot password?</button>
              </div>

              <button type="submit" className={styles.button} disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
              {/* done by "HDC" - backend auth error display. */}
              {statusMessage && (
                <p role="alert" style={{ margin: 0, color: '#b42318', fontWeight: 600 }}>
                  {statusMessage}
                </p>
              )}
              {/* end done by "HDC" */}
            </form>

            <div className={styles.testButtons}>
              <p className={styles.testLabel}>Test Credentials:</p>
              <div className={styles.testButtonsGroup}>
                <button
                  type="button"
                  className={styles.testButton}
                  onClick={() => fillTestCredentials('admin')}
                >
                  Admin
                </button>
                <button
                  type="button"
                  className={styles.testButton}
                  onClick={() => fillTestCredentials('staff')}
                >
                  Store Staff
                </button>
                <button
                  type="button"
                  className={styles.testButton}
                  onClick={() => fillTestCredentials('customer')}
                >
                  Customer
                </button>
              </div>
            </div>

            <div className={styles.footerRow}>
              <span>Don&apos;t have an account?</span>
              <Link href="/register" className={styles.registerLink}>Register for free</Link>
            </div>
          </div>

          <div className={styles.visualPanel}>
            <div className={styles.visualFrame}>
              <div className={styles.visualGlow} />
              <div className={styles.visualImageWrap}>
                <Image
                  src="/img/bubble_teas/test.jpg"
                  alt="DripTea"
                  fill
                  priority
                  className={styles.visualImage}
                  sizes="(max-width: 1080px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
