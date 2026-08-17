
import Link from "next/link";

import styles from "./AppNav.module.css";

export default function AppNav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Willis Port
        </Link>

        <div className={styles.links}>
          <Link href="/">Dashboard</Link>
          <Link href="/customers">Customers</Link>
          <Link href="/containers">Containers</Link>
          <Link href="/requests/new">New Request</Link>
        </div>
      </div>
    </nav>
  );
}
