'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../context/AuthContext'
import AccountButton from '../components/AccountButton'
import '../globals.css'

export default function PrivacyPage() {
  const { user, loading, credits } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">
          <div className="spinner"></div>
          <span style={{ color: '#000000' }}>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid #e5e5e5',
          padding: '24px 0',
          background: '#ffffff',
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <div className="header-inner" style={{
          maxWidth: '100%',
          margin: '0 auto',
          padding: '0 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link 
            href="/" 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#000000', 
              letterSpacing: '-0.5px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            <Image src="/logo.svg" alt="Post My Note" width={40} height={40} priority style={{ width: '40px', height: '40px' }} />
            <span>Post My Note</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <AccountButton
                credits={credits?.credits_remaining ?? 0}
                subscriptionStatus={credits?.subscription_status ?? null}
                currentPlan={credits?.current_plan ?? null}
              />
            ) : (
              <Link
                href="/signup"
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  border: '1px solid #e5e5e5',
                  color: '#000000',
                  fontSize: '16px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e5e5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                }}
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '60px 24px',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: '800',
            color: '#000000',
            marginBottom: '8px',
          }}
        >
          Privacy Policy — Post My Note
        </h1>
        
        <p style={{ color: '#666666', marginBottom: '48px', fontSize: '14px' }}>
          Last updated: 10th, November, 2025
        </p>

        <div style={{ color: '#333333', lineHeight: '1.8', fontSize: '15px' }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              1. Overview
            </h2>
            <p style={{ marginBottom: '16px' }}>
              This Privacy Policy explains how Post My Note collects, uses, shares, and protects information when you use our websites and Service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              2. Personal Data We Collect
            </h2>
            <p style={{ marginBottom: '16px' }}>
              <strong>You provide:</strong> account details, payment details via our processor, content and files, support messages.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>Automatically collected:</strong> device and log data, approximate location, usage analytics, cookies and similar technologies. Marketing SaaS platforms commonly disclose cookie categories and analytics/advertising uses.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>From third parties:</strong> social or identity providers you connect, and service vendors.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              3. How We Use Personal Data
            </h2>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Provide, maintain, and improve the Service</li>
              <li style={{ marginBottom: '8px' }}>Personalize templates and recommendations</li>
              <li style={{ marginBottom: '8px' }}>Communicate about features, security, and service updates</li>
              <li style={{ marginBottom: '8px' }}>Billing and account management</li>
              <li style={{ marginBottom: '8px' }}>Analytics, debugging, and fraud prevention</li>
              <li style={{ marginBottom: '8px' }}>Marketing with your choices respected</li>
            </ul>
            <p style={{ marginBottom: '16px' }}>
              Our legal bases under GDPR/UK GDPR include consent and contract, along with legitimate interests where appropriate.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              4. Cookies and Similar Technologies
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We use required, functional, analytics, and advertising cookies. You can manage preferences via our cookie banner or your browser. This mirrors common cookie statements used by leading marketing platforms.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              5. AI Processing
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We process prompts and outputs to deliver features like content generation, formatting, and recommendations. We may use de-identified data to improve quality and safety. You may opt out of improvement uses where applicable, except data needed to provide the Service.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              6. Sharing and Disclosure
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We share data with:
            </p>
            <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
              <li style={{ marginBottom: '8px' }}>Service providers and subprocessors for hosting, analytics, customer support, payments, and AI processing</li>
              <li style={{ marginBottom: '8px' }}>Third-party integrations you enable</li>
              <li style={{ marginBottom: '8px' }}>Authorities when legally required</li>
              <li style={{ marginBottom: '8px' }}>Buyers in a merger, acquisition, or asset sale</li>
            </ul>
            <p style={{ marginBottom: '16px' }}>
              Example SaaS terms commonly reference integrations and vendor sharing.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              7. International Data Transfers
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Where data moves outside your region, we rely on appropriate safeguards like Standard Contractual Clauses and comparable mechanisms under GDPR/UK GDPR.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              8. Data Retention
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We keep personal data for as long as needed to provide the Service and meet legal obligations, then delete or anonymize it.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              9. Your Rights
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Depending on your location, you may have rights to access, correct, delete, restrict, object, port, or withdraw consent. California residents have rights to know, delete, correct, and opt out of certain data sharing or "sales" under CCPA/CPRA.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>California Notice at Collection</strong>
            </p>
            <p style={{ marginBottom: '16px' }}>
              We collect personal information in the categories described above for the purposes in Section 3. We do not sell personal information in exchange for money. If we "share" for cross-context behavioral advertising, you can opt out via "Do Not Sell or Share My Personal Information." Rights and obligations are defined by CCPA/CPRA.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              10. Children's Privacy
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Service is not directed to children under 16, and we do not knowingly collect their personal data.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              11. Security
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We use reasonable technical and organizational measures to protect data, recognizing no method is completely secure.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              12. Data Controller and Contacts
            </h2>
            <p style={{ marginBottom: '16px' }}>
              EU/UK users: the data controller is Post My Note. You may contact your local supervisory authority if you have concerns about our processing under GDPR/UK GDPR.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>Contact us:</strong> hello@postmynote.app
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              13. Data Processing Addendum (DPA)
            </h2>
            <p style={{ marginBottom: '16px' }}>
              For customers acting as controllers under GDPR/UK GDPR, our DPA governs processing on your behalf and includes subprocessors and transfer mechanisms. Request our DPA at hello@postmynote.app. Lawful-basis and controller/processor roles are defined by GDPR.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              14. Changes to this Policy
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We will post any changes on this page and update the "Last updated" date. If changes materially affect your rights, we will provide additional notice.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

