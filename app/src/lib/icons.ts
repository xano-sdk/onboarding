/**
 * The preview's icon set, resolved from the user's choice.
 *
 * A fixed roster imported from all three libraries by name, rather than a
 * dynamic lookup. Two reasons, and the second is the real one:
 *
 * - Named imports tree-shake. A dynamic `icons[name]` against a barrel pulls
 *   every icon in all three packages into the bundle.
 * - The preview's whole job is to show what you will get. Rendering a Lucide
 *   glyph while the scaffold installs Tabler would make the one thing this pane
 *   exists for a lie — and the difference between these sets is exactly the
 *   kind you only notice side by side, which is where the user is standing.
 */
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Calendar,
  ChartBar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Copy,
  CreditCard,
  File,
  Filter,
  House,
  Info,
  Loader,
  Mail,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  IconActivity,
  IconAlertCircle,
  IconArrowDownRight,
  IconArrowRight,
  IconArrowUpRight,
  IconBell,
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconCreditCard,
  IconDeviceDesktop,
  IconDots,
  IconFile,
  IconFilter,
  IconHome,
  IconInfoCircle,
  IconLoader,
  IconMail,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSettings,
  IconStar,
  IconSun,
  IconTrash,
  IconTrendingUp,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import {
  Pulse as PhActivity,
  ArrowDownRight as PhArrowDownRight,
  ArrowRight as PhArrowRight,
  ArrowUpRight as PhArrowUpRight,
  Bell as PhBell,
  Calendar as PhCalendar,
  CaretDown as PhCaretDown,
  CaretRight as PhCaretRight,
  ChartBar as PhChartBar,
  Check as PhCheck,
  Copy as PhCopy,
  CreditCard as PhCreditCard,
  Desktop as PhDesktop,
  DotsThree as PhDots,
  Envelope as PhMail,
  File as PhFile,
  Funnel as PhFilter,
  Gear as PhGear,
  House as PhHouse,
  Info as PhInfo,
  MagnifyingGlass as PhSearch,
  Moon as PhMoon,
  Plus as PhPlus,
  Spinner as PhSpinner,
  Star as PhStar,
  Sun as PhSun,
  Trash as PhTrash,
  TrendUp as PhTrendUp,
  Users as PhUsers,
  WarningCircle as PhWarning,
  X as PhX,
} from "@phosphor-icons/react";
import type { ComponentType } from "react";

export type IconName =
  | "activity"
  | "alert"
  | "arrowDown"
  | "arrowRight"
  | "arrowUp"
  | "bell"
  | "calendar"
  | "card"
  | "chart"
  | "check"
  | "chevronDown"
  | "chevronRight"
  | "copy"
  | "file"
  | "filter"
  | "home"
  | "info"
  | "mail"
  | "monitor"
  | "moon"
  | "more"
  | "plus"
  | "search"
  | "settings"
  | "spinner"
  | "star"
  | "sun"
  | "trash"
  | "trending"
  | "users"
  | "x";

/** Every icon takes a className, which is all the preview needs from it. */
type Icon = ComponentType<{ className?: string }>;

const SETS: Record<string, Record<IconName, Icon>> = {
  lucide: {
    activity: Activity,
    alert: CircleAlert,
    arrowDown: ArrowDownRight,
    arrowRight: ArrowRight,
    arrowUp: ArrowUpRight,
    bell: Bell,
    calendar: Calendar,
    card: CreditCard,
    chart: ChartBar,
    check: Check,
    chevronDown: ChevronDown,
    chevronRight: ChevronRight,
    copy: Copy,
    file: File,
    filter: Filter,
    home: House,
    info: Info,
    mail: Mail,
    monitor: Monitor,
    moon: Moon,
    more: MoreHorizontal,
    plus: Plus,
    search: Search,
    settings: Settings,
    spinner: Loader,
    star: Star,
    sun: Sun,
    trash: Trash2,
    trending: TrendingUp,
    users: Users,
    x: X,
  },
  tabler: {
    activity: IconActivity,
    alert: IconAlertCircle,
    arrowDown: IconArrowDownRight,
    arrowRight: IconArrowRight,
    arrowUp: IconArrowUpRight,
    bell: IconBell,
    calendar: IconCalendar,
    card: IconCreditCard,
    chart: IconChartBar,
    check: IconCheck,
    chevronDown: IconChevronDown,
    chevronRight: IconChevronRight,
    copy: IconCopy,
    file: IconFile,
    filter: IconFilter,
    home: IconHome,
    info: IconInfoCircle,
    mail: IconMail,
    monitor: IconDeviceDesktop,
    moon: IconMoon,
    more: IconDots,
    plus: IconPlus,
    search: IconSearch,
    settings: IconSettings,
    spinner: IconLoader,
    star: IconStar,
    sun: IconSun,
    trash: IconTrash,
    trending: IconTrendingUp,
    users: IconUsers,
    x: IconX,
  },
  phosphor: {
    activity: PhActivity,
    alert: PhWarning,
    arrowDown: PhArrowDownRight,
    arrowRight: PhArrowRight,
    arrowUp: PhArrowUpRight,
    bell: PhBell,
    calendar: PhCalendar,
    card: PhCreditCard,
    chart: PhChartBar,
    check: PhCheck,
    chevronDown: PhCaretDown,
    chevronRight: PhCaretRight,
    copy: PhCopy,
    file: PhFile,
    filter: PhFilter,
    home: PhHouse,
    info: PhInfo,
    mail: PhMail,
    monitor: PhDesktop,
    moon: PhMoon,
    more: PhDots,
    plus: PhPlus,
    search: PhSearch,
    settings: PhGear,
    spinner: PhSpinner,
    star: PhStar,
    sun: PhSun,
    trash: PhTrash,
    trending: PhTrendUp,
    users: PhUsers,
    x: PhX,
  },
};

export function iconSet(library: string): Record<IconName, Icon> {
  return SETS[library] ?? SETS.lucide!;
}
