import { Link } from "@tanstack/react-router";
import { Section } from "../layout/Section";
import { Grid } from "../layout/Grid";
import { DownloadProduct } from "../conversion/DownloadProduct";
import { CTAButton } from "../conversion/CTAButton";
import { HOME_DOWNLOAD_ORDER } from "@/content/home";

export function HomeDownloads() {
  return (
    <Section
      id="downloads"
      eyebrow="Downloads"
      title="Get the apps your campus needs."
      lede="Admin and Nexus: web, Android, and Windows. Connect and Transport: Android only. Admissions and Careers: web plus Android. File downloads stay off until a verified public APK or installer URL is published."
      tone="muted"
    >
      <Grid columns={2} stagger>
        {HOME_DOWNLOAD_ORDER.map((id) => (
          <DownloadProduct key={id} id={id} compact />
        ))}
      </Grid>
      <p className="mt-6">
        <CTAButton asChild variant="ghost" className="px-0">
          <Link to="/resources/downloads" search={{}}>
            All download details
          </Link>
        </CTAButton>
      </p>
    </Section>
  );
}
