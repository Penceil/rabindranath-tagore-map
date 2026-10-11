"use client";

import { useLayoutEffect, useRef } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

/**
 * A motion value computed from others and kept in step with them synchronously.
 *
 * framer-motion's own useTransform defers each update to its next frame. Under
 * React's strict mode the effect remount cancels that pending frame, and a source
 * that is then set to the same value again never fires another change, so the
 * result stays stale: the map's dots stuck at their unscaled positions. Here the
 * value is recomputed on subscribe and on every change, with nothing deferred.
 */
export const useDerived = (sources: MotionValue<number>[], compute: (values: number[]) => number) => {
    const output = useMotionValue(0);
    const computeRef = useRef(compute);
    computeRef.current = compute;

    useLayoutEffect(() => {
        const update = () => output.set(computeRef.current(sources.map((source) => source.get())));
        update();
        const unsubscribers = sources.map((source) => source.on("change", update));
        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
        // The sources are motion values, stable for the life of the component.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [output, ...sources]);

    return output;
};
