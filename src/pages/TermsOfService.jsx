import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <img src="https://media.base44.com/images/public/69bdbcef4144ce037aefb6a3/c55f97736_THRFTlogoroundedappiconphoto.png" alt="THRFT" className="w-10 h-10 rounded-xl" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: March 28, 2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By accessing or using the THRFT Airdrop Campaign platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. Description of Service</h2>
            <p className="text-muted-foreground">The THRFT Airdrop platform allows users to connect their social media accounts (including X/Twitter, TikTok, YouTube, Telegram, and Discord) to earn points for engaging with THRFT-related content. Points may be redeemed or converted according to current campaign rules.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. Eligibility</h2>
            <p className="text-muted-foreground">You must be at least 18 years old to participate. The Service is void where prohibited by law. You are responsible for ensuring your participation complies with all local laws and regulations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Account Registration</h2>
            <p className="text-muted-foreground">You must provide accurate and complete information when registering. You are responsible for maintaining the security of your account. One account per person is permitted. We reserve the right to suspend or terminate accounts found to be in violation of these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Social Media Account Connection</h2>
            <p className="text-muted-foreground">By connecting your social media accounts, you grant THRFT permission to access publicly available data including your handle, follower count, posts, and engagement metrics for the purposes of calculating and awarding points. We do not post on your behalf or access private messages.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Points System</h2>
            <p className="text-muted-foreground">Points are awarded based on engagement with THRFT-related content. THRFT reserves the right to modify point values, multipliers, and reward structures at any time. Points have no guaranteed monetary value and are subject to campaign terms. We reserve the right to reverse points awarded through fraudulent or inauthentic activity.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Prohibited Conduct</h2>
            <p className="text-muted-foreground">You may not: use bots, scripts, or automated tools to artificially inflate engagement; create multiple accounts; submit false or misleading information; engage in any activity designed to manipulate the points system; or use the Service for any unlawful purpose.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Intellectual Property</h2>
            <p className="text-muted-foreground">All content, trademarks, and materials on the THRFT platform are owned by THRFT and its licensors. You may not reproduce, distribute, or create derivative works without express written permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">The Service is provided "as is" without warranties of any kind. THRFT does not guarantee uninterrupted access, accuracy of points calculations, or that the Service will be error-free.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Limitation of Liability</h2>
            <p className="text-muted-foreground">To the fullest extent permitted by law, THRFT shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Changes to Terms</h2>
            <p className="text-muted-foreground">We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">12. Contact</h2>
            <p className="text-muted-foreground">For questions about these Terms, contact us at <a href="mailto:legal@thrft.app" className="text-primary hover:underline">legal@thrft.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}