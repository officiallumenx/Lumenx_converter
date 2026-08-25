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
      title="Open the apps that exist. Do not wait on a fake store listing."
      lede="Android and iOS listings are not published from this site. Admissions and Careers are Connect portals — they do not have a separate download."
      tone="muted"
    >
      <Grid columns={2} stagger>
        {HOME_DOWNLOAD_ORDER.map((id) => (
          <DownloadProduct key={id} id={id} compact />
        ))}
      </Grid>
      <p className="mt-6">
        <CTAButton asChild variant="ghost" className="px-0">
          <Link to="/downloads" search={{}}>
            All download details
          </Link>
        </CTAButton>
      </p>
    </Section>
  );
}
