"use client";

import { ExternalLink, Lightbulb, Bug, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface ContactLinkProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ContactLink({ href, icon, title, description }: ContactLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
    >
      <div className="flex-shrink-0 p-2 rounded-lg bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">{title}</h3>
          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </a>
  );
}

export function ContactTab() {
  const t = useTranslations("settings.contact");

  const links: ContactLinkProps[] = [
    {
      href: "https://github.com/tamagochat/opentamago/discussions",
      icon: <Lightbulb className="h-5 w-5" />,
      title: t("featureIdea"),
      description: t("featureDesc"),
    },
    {
      href: "https://github.com/tamagochat/opentamago/issues",
      icon: <Bug className="h-5 w-5" />,
      title: t("bugReport"),
      description: t("bugDesc"),
    },
    {
      href: "https://discord.gg/DyMCd3e2",
      icon: <MessageCircle className="h-5 w-5" />,
      title: t("community"),
      description: t("communityDesc"),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {links.map((link) => (
          <ContactLink key={link.href} {...link} />
        ))}
      </CardContent>
    </Card>
  );
}
