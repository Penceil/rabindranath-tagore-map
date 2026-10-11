import type { ReactNode } from "react";
import MicrositeHeader from "../components/MicrositeHeader";
import MicrositeFooter from "../components/MicrositeFooter";
import styles from "../styles/microsite.module.css";

type MicrositeLayoutProps = {
  children: ReactNode;
};

/** The microsite's header and footer around a page; the demo has no toasts, so no provider. */
const MicrositeLayout = ({ children }: MicrositeLayoutProps) => (
  <div className={styles.shell}>
    <MicrositeHeader />
    <main className={styles.main}>{children}</main>
    <MicrositeFooter />
  </div>
);

export default MicrositeLayout;
