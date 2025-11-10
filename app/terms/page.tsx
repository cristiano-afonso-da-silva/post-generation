'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '../context/AuthContext'
import AccountButton from '../components/AccountButton'
import '../globals.css'

export default function TermsPage() {
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
      {/* Navigation */}
      <nav
        style={{
          position: 'sticky',
          top: '16px',
          zIndex: 100,
          padding: '0 24px',
          marginBottom: '0',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px',
            background: 'rgba(255, 255, 255, 0.98)',
            borderRadius: '999px',
            border: '1px solid #e5e5e5',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Link 
            href="/" 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '20px',
              fontWeight: '700', 
              color: '#000000', 
              textDecoration: 'none',
            }}
          >
            <Image src="/logo.svg" alt="Post My Note" width={40} height={40} priority style={{ width: '40px', height: '40px' }} />
            <span>Post My Note</span>
          </Link>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                  padding: '10px 24px',
                  borderRadius: '999px',
                  background: 'transparent',
                  border: '1px solid #e5e5e5',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </nav>

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
          Terms of Service — Post My Note
        </h1>
        
        <p style={{ color: '#666666', marginBottom: '48px', fontSize: '14px' }}>
          Last updated: 10th, November, 2025
        </p>

        <div style={{ color: '#333333', lineHeight: '1.8', fontSize: '15px' }}>
          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              1. Agreement to Terms
            </h2>
            <p style={{ marginBottom: '16px' }}>
              By using Post My Note, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the Service. Similar "click-through" acceptance language is standard across SaaS agreements.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              2. Who we are
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Post My Note ("Company," "we," "our") provides an online platform to draft and design marketing content and social posts with AI assistance (the "Service").
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              3. Accounts
            </h2>
            <p style={{ marginBottom: '16px' }}>
              You must be at least 16, provide accurate information, keep credentials secure, and promptly notify us of any unauthorized use.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              4. Subscriptions, Trials, Billing, and Renewals
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Paid plans are billed in advance on a monthly or annual basis and renew automatically unless canceled before the renewal date. Auto-renew is common in SaaS agreements.
            </p>
            <p style={{ marginBottom: '16px' }}>
              You may cancel at any time in your account settings; access continues until the end of the current term. Many self-serve marketing SaaS offerings do not prorate or refund remaining term.
            </p>
            <p style={{ marginBottom: '16px' }}>
              Fees are exclusive of taxes. We may change prices with notice effective on your next term.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              5. Refunds
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Unless required by law, fees are non-refundable. Some marketing SaaS vendors state non-refundability for self-serve plans while offering discretionary reviews.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              6. Your Content and AI Outputs
            </h2>
            <p style={{ marginBottom: '16px' }}>
              <strong>Input Content.</strong> You retain ownership of prompts, text, and assets you upload ("User Content"). You grant us a license to host, process, and display User Content to provide the Service.
            </p>
            <p style={{ marginBottom: '16px' }}>
              <strong>AI Outputs.</strong> Outputs may be similar to content generated for others, are provided "as is," and may require review for accuracy, originality, and compliance with your brand and applicable laws.
            </p>
            <p style={{ marginBottom: '16px' }}>
              You are responsible for securing rights to any third-party assets you upload and for how you use outputs.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              7. Acceptable Use
            </h2>
            <p style={{ marginBottom: '16px' }}>
              You will not: violate laws or rights, upload illegal or infringing content, attempt to reverse engineer or interfere with the Service, or use outputs for misleading or deceptive advertising.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              8. Third-Party Services
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Service may integrate with third-party tools (e.g., social, analytics, AI providers). Your use of those tools is subject to their terms and policies.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              9. Intellectual Property
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Service, software, templates, and brand assets are owned by us and our licensors. Except for rights expressly granted to you, all rights are reserved.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              10. Feedback
            </h2>
            <p style={{ marginBottom: '16px' }}>
              If you send ideas or suggestions, you grant us a non-exclusive, royalty-free license to use them without restriction.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              11. Confidentiality
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Each party may access the other's non-public information and will use reasonable care to protect it and only use it for the relationship.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              12. Privacy and Data Processing
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We process personal data as described in our Privacy Policy and, where required, under a Data Processing Addendum (DPA) for customers subject to GDPR/UK GDPR. Lawful bases for processing are typically consent and contract.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              13. Security
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We implement reasonable technical and organizational measures to protect data. No method is 100% secure.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              14. Beta and Free Features
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We may offer beta or free features that are experimental, subject to change, and provided without warranties.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              15. Disclaimers
            </h2>
            <p style={{ marginBottom: '16px' }}>
              The Service and outputs are provided "as is" and "as available."
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              16. Limitation of Liability
            </h2>
            <p style={{ marginBottom: '16px' }}>
              To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages. Our total liability under these Terms is limited to the fees you paid in the 12 months before the claim.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              17. Indemnification
            </h2>
            <p style={{ marginBottom: '16px' }}>
              You will defend and indemnify us against claims arising from your use of the Service, your User Content, or your violation of these Terms.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              18. Suspension and Termination
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We may suspend or terminate the Service for cause, including breach or misuse, with notice where reasonable. Your rights end upon termination; sections that by nature should survive will survive.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              19. Changes to the Service or Terms
            </h2>
            <p style={{ marginBottom: '16px' }}>
              We may update the Service and these Terms. Material changes will be notified; continued use after the effective date constitutes acceptance.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              20. Governing Law and Dispute Resolution
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Specify your jurisdiction and dispute process here, e.g., binding arbitration and class-action waiver where permitted.
            </p>
          </section>

          <section style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '12px' }}>
              21. Contact
            </h2>
            <p style={{ marginBottom: '16px' }}>
              Post My Note
            </p>
            <p style={{ marginBottom: '16px' }}>
              hello@postmynote.app
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

