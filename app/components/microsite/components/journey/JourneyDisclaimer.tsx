/**
 * The note under the map on how to read its routes, as in the design: a gold band
 * between the map and the footer, two lines across a desktop screen and a short
 * paragraph on phones.
 */
const JourneyDisclaimer = () => (
    <aside
        aria-label="Disclaimer"
        className="bg-s2s-gold px-4 py-[18px] text-[12px] leading-[20px] text-white lg:px-[63px] lg:pb-4 lg:pt-[17px] lg:text-[14px] lg:leading-[25px]"
    >
        <p>
            <span className="font-medium">Disclaimer:</span> The routes depicted are intended to illustrate historically
            documented or reconstructed movements and connections. They are representational rather than metrically
            precise, and are not consistently drawn to scale. Their configuration should therefore be read as a visual
            guide to historical mobility and connectivity, rather than as an exact representation of geographical
            trajectories or distances.
        </p>
    </aside>
);

export default JourneyDisclaimer;
