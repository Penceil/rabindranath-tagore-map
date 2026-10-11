import MicrositeLayout from "./components/microsite/layouts/MicrositeLayout";
import JourneyPage from "./components/microsite/pages/JourneyPage";

/** The demo's only page: the journey map inside the microsite's header and footer. */
export default function Page() {
  return (
    <MicrositeLayout>
      <JourneyPage />
    </MicrositeLayout>
  );
}
