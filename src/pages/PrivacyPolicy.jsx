import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <img src="https://media.base44.com/images/public/69bdbcef4144ce037aefb6a3/c55f97736_THRFTlogoroundedappiconphoto.png" alt="THRFT" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: March 28, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
            <p className="text-muted-foreground">THRFT ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the THRFT Airdrop Campaign platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
            <p className="text-muted-foreground font-medium mb-1">Information you provide directly:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Email address and account credentials</li>
              <li>Social media handles (X/Twitter, TikTok, YouTube, Telegram, Discord)</li>
              <li>Follower counts and other profile information you submit</li>
            </ul>
            <p className="text-muted-foreground font-medium mt-3 mb-1">Information collected automatically:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Publicly available social media data (posts, engagement metrics, view counts)</li>
              <li>Points earned and activity history on our platform</li>
              <li>Usage data and interaction logs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. TikTok Data</h2>
            <p className="text-muted-foreground">When you connect your TikTok account or we access TikTok data through the TikTok Research API, we collect only publicly available information including: username, video content, hashtags used, view counts, like counts, comment counts, and share counts. We use this data solely to calculate and award engagement points. We do not access your TikTok private messages, followers list, or any non-public data. TikTok data is processed in accordance with TikTok's Terms of Service and Developer Policies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. How We Use Your Information</h2>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>To calculate and award points for social media engagement</li>
              <li>To display leaderboard rankings and activity history</li>
              <li>To send notifications about points earned and campaign updates</li>
              <li>To prevent fraud and enforce our Terms of Service</li>
              <li>To improve and maintain the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Data Sharing</h2>
            <p className="text-muted-foreground">We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-1">
              <li>Service providers who help us operate the platform (under confidentiality agreements)</li>
              <li>Law enforcement when required by law</li>
              <li>Other users in the form of public leaderboard rankings (handle and points only)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
            <p className="text-muted-foreground">We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Security</h2>
            <p className="text-muted-foreground">We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Your Rights</h2>
            <p className="text-muted-foreground">Depending on your location, you may have rights to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; opt out of certain data processing. To exercise these rights, contact us at <a href="mailto:privacy@thrft.app" className="text-primary hover:underline">privacy@thrft.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Cookies</h2>
            <p className="text-muted-foreground">We use essential cookies to maintain your session and authentication. We do not use third-party advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Children's Privacy</h2>
            <p className="text-muted-foreground">The Service is not directed to individuals under 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Changes to This Policy</h2>
            <p className="text-muted-foreground">We may update this Privacy Policy periodically. We will notify you of significant changes by posting the new policy on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">12. Contact Us</h2>
            <p className="text-muted-foreground">For privacy-related questions or requests, contact us at <a href="mailto:privacy@thrft.app" className="text-primary hover:underline">privacy@thrft.app</a> or visit <a href="https://thrft.app" className="text-primary hover:underline">thrft.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}