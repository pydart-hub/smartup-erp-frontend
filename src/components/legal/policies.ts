export const COMPANY_INFO = {
  legalName: "Smart Up Learning Ventures",
  address:
    "2nd Floor, Thomson Building, 55/3171, Cheruparambath Rd, Tagore Nagar, Giri Nagar, Kadavanthra, Kochi, Ernakulam, Kerala 682020",
  email: "smartuplearningventures@gmail.com",
  phone: "+91 7356072106",
  gst: "32CTRPS7340P2ZR",
  jurisdiction: "District Court of Ernakulam, Kerala, India",
};

export interface PolicySection {
  heading: string;
  content: string;
}

export interface Policy {
  title: string;
  lastUpdated: string;
  sections: PolicySection[];
}

export const POLICIES: Record<string, Policy> = {
  terms: {
    title: "Terms & Conditions",
    lastUpdated: "March 18, 2026",
    sections: [
      {
        heading: "1. Introduction",
        content:
          "Welcome to Smart Up Learning Ventures. By accessing or using our platform, you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, please do not use our services.",
      },
      {
        heading: "2. Services",
        content:
          "Smart Up Learning Ventures provides an education management platform that includes student enrollment, course management, batch scheduling, attendance tracking, and fee collection services. Our platform is designed for educational institutions and their stakeholders.",
      },
      {
        heading: "3. User Accounts",
        content:
          "Users are responsible for maintaining the confidentiality of their account credentials. You agree to provide accurate and complete information during registration and to update such information as necessary. You are solely responsible for all activities that occur under your account.",
      },
      {
        heading: "4. Payment Terms",
        content:
          "All fees and charges are as communicated at the time of enrollment. Payments are processed securely through Razorpay, our authorized payment gateway. By making a payment, you agree to Razorpay's terms of service in addition to ours. All amounts are in Indian Rupees (INR).",
      },
      {
        heading: "5. Intellectual Property",
        content:
          "All content, materials, trademarks, and intellectual property on this platform are owned by Smart Up Learning Ventures or its licensors. You may not reproduce, distribute, or create derivative works without prior written consent.",
      },
      {
        heading: "6. User Obligations",
        content:
          "Users agree to use the platform only for lawful purposes and in accordance with these terms. You shall not misuse the platform, attempt to gain unauthorized access, or interfere with the proper functioning of the service.",
      },
      {
        heading: "7. Limitation of Liability",
        content:
          "To the maximum extent permitted by applicable law, Smart Up Learning Ventures shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.",
      },
      {
        heading: "8. Termination",
        content:
          "We reserve the right to suspend or terminate your access to the platform at our sole discretion, without prior notice, for conduct that we believe violates these terms or is harmful to other users, us, or third parties.",
      },
      {
        heading: "9. Amendments",
        content:
          "We reserve the right to modify these Terms & Conditions at any time. Changes will be effective immediately upon posting on the platform. Continued use of the service after any such changes constitutes your acceptance of the new terms.",
      },
      {
        heading: "10. Governing Law & Jurisdiction",
        content:
          "These Terms & Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the District Court of Ernakulam, Kerala, India.",
      },
      {
        heading: "11. Contact",
        content:
          "For any questions regarding these Terms & Conditions, please contact us at smartuplearningventures@gmail.com or call +91 7356072106.",
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    lastUpdated: "March 18, 2026",
    sections: [
      {
        heading: "1. Introduction",
        content:
          "Smart Up Learning Ventures is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and disclose your personal information when you use our education management platform.",
      },
      {
        heading: "2. Information We Collect",
        content:
          "We collect personal information that you provide directly, including: name, email address, phone number, address, student details, enrollment information, and payment details. We may also collect device information, IP addresses, and usage data automatically through cookies and similar technologies.",
      },
      {
        heading: "3. How We Use Your Information",
        content:
          "We use your information to: provide and maintain our services, process payments and send transaction notifications, communicate with you about your account and our services, improve and personalize user experience, comply with legal obligations, and protect against unauthorized access or fraud.",
      },
      {
        heading: "4. Payment Information",
        content:
          "Payment processing is handled by Razorpay, our authorized payment gateway partner. We do not store your complete credit/debit card details on our servers. Razorpay's privacy policy governs the handling of your payment information. Please refer to Razorpay's privacy policy at https://razorpay.com/privacy/ for more details.",
      },
      {
        heading: "5. Data Sharing",
        content:
          "We do not sell, trade, or rent your personal information to third parties. We may share your data with: Razorpay (for payment processing), email/SMS service providers (for transactional communications), and as required by law or legal proceedings.",
      },
      {
        heading: "6. Data Security",
        content:
          "We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.",
      },
      {
        heading: "7. Data Retention",
        content:
          "We retain your personal information for as long as your account is active or as needed to provide services. We may retain certain information as required by law or for legitimate business purposes.",
      },
      {
        heading: "8. Your Rights",
        content:
          "You have the right to: access your personal information, request correction of inaccurate data, request deletion of your data (subject to legal requirements), and withdraw consent for data processing. To exercise these rights, contact us at smartuplearningventures@gmail.com.",
      },
      {
        heading: "9. Cookies",
        content:
          "Our platform uses cookies and similar technologies to enhance user experience, analyze usage patterns, and maintain session security. You can manage cookie preferences through your browser settings.",
      },
      {
        heading: "10. Changes to This Policy",
        content:
          "We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.",
      },
      {
        heading: "11. Grievance Officer",
        content:
          "For any privacy-related concerns or grievances, please contact:\n\nSmart Up Learning Ventures\nEmail: smartuplearningventures@gmail.com\nPhone: +91 7356072106\nAddress: 2nd Floor, Thomson Building, 55/3171, Cheruparambath Rd, Tagore Nagar, Giri Nagar, Kadavanthra, Kochi, Ernakulam, Kerala 682020",
      },
    ],
  },

  refund: {
    title: "Refund Policy",
    lastUpdated: "March 18, 2026",
    sections: [
      {
        heading: "1. Overview",
        content:
          "This Refund Policy outlines the conditions under which Smart Up Learning Ventures may process refunds for payments made through our platform.",
      },
      {
        heading: "2. Refund Eligibility",
        content:
          "Eligible refunds will be processed only after review and approval by our team. Refund requests are evaluated on a case-by-case basis, taking into account the nature of the service and the timing of the request.",
      },
      {
        heading: "3. Refund Process",
        content:
          "Refunds will be credited back to the original payment method used during the transaction. The processing time for refunds is typically 7–10 business days, depending on the payment gateway and your bank.",
      },
      {
        heading: "4. Non-Refundable Charges",
        content:
          "Payment gateway charges, transaction fees, and administrative costs are non-refundable. These charges are deducted from the refund amount where applicable.",
      },
      {
        heading: "5. How to Request a Refund",
        content:
          "To request a refund, please contact us at smartuplearningventures@gmail.com or call +91 7356072106 with your payment details and reason for the refund request.",
      },
      {
        heading: "6. Right to Decline",
        content:
          "Smart Up Learning Ventures reserves the right to decline a refund request if it does not meet the eligibility criteria outlined in this policy.",
      },
    ],
  },

  cancellation: {
    title: "Cancellation Policy",
    lastUpdated: "March 18, 2026",
    sections: [
      {
        heading: "1. Overview",
        content:
          "This Cancellation Policy describes the terms under which users may cancel their enrollment or services with Smart Up Learning Ventures.",
      },
      {
        heading: "2. How to Cancel",
        content:
          "Users may request cancellation of enrollment by contacting us via email at smartuplearningventures@gmail.com or by calling +91 7356072106.",
      },
      {
        heading: "3. Cancellation Before Commencement",
        content:
          "Cancellation requests made before the commencement of the course or service may be eligible for a refund, subject to deduction of applicable charges as outlined in our Refund Policy.",
      },
      {
        heading: "4. Cancellation After Commencement",
        content:
          "Once the course or service has started, no cancellation or refund requests will be entertained. This applies to all courses, batches, and services offered through our platform.",
      },
      {
        heading: "5. Right to Cancel by Smart Up",
        content:
          "Smart Up Learning Ventures reserves the right to cancel any course or service due to unforeseen circumstances. In such cases, a full refund will be provided to the affected users.",
      },
    ],
  },

  shipping: {
    title: "Shipping Policy",
    lastUpdated: "March 18, 2026",
    sections: [
      {
        heading: "1. Digital Services",
        content:
          "Smart Up Learning Ventures is an education management platform that provides digital services only. We do not sell or ship any physical goods or products.",
      },
      {
        heading: "2. Service Delivery",
        content:
          "All our services — including course access, batch enrollment, and platform features — are delivered digitally through our online platform. Access is provided immediately upon successful enrollment and payment.",
      },
      {
        heading: "3. Contact",
        content:
          "For any questions regarding service delivery, please contact us at smartuplearningventures@gmail.com or call +91 7356072106.",
      },
    ],
  },
};
