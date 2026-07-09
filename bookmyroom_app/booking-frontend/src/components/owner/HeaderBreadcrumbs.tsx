// src/components/owner/HeaderBreadcrumbs.tsx
// Matches Lesson 23 section 23.8.6. Route-aware header title built on the
// shadcn Breadcrumb primitive. Strips a configurable prefix (/owner by
// default), prepends a "Home" crumb, shortens Mongo ObjectIds to "#abcd".
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface HeaderBreadcrumbsProps {
  homeUrl?: string;
  rootLabel?: string;
  stripPrefix?: string;
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function friendlyName(segment: string): string {
  if (OBJECT_ID.test(segment)) return `#${segment.slice(-4)}`;
  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HeaderBreadcrumbs({
  homeUrl = "/owner/dashboard",
  rootLabel = "Home",
  stripPrefix = "/owner",
}: HeaderBreadcrumbsProps) {
  const { pathname } = useLocation();

  const relative = pathname.startsWith(stripPrefix)
    ? pathname.slice(stripPrefix.length)
    : pathname;

  const segments = relative.split("/").filter(Boolean);
  const items = segments.map((segment, index) => ({
    label: friendlyName(segment),
    href:
      segment === "dashboard"
        ? homeUrl
        : stripPrefix + "/" + segments.slice(0, index + 1).join("/"),
  }));

  const allItems =
    segments[0] === "dashboard"
      ? [{ label: rootLabel, href: homeUrl }]
      : [{ label: rootLabel, href: homeUrl }, ...items];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          return (
            <BreadcrumbItem key={`${item.label}-${index}`}>
              {isLast ? (
                <BreadcrumbPage className="max-w-[160px] truncate">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={item.href} className="max-w-[140px] truncate">
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
