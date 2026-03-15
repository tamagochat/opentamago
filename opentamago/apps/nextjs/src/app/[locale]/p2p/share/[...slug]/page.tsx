import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { DownloadClient } from "./download-client";

interface Props {
  params: Promise<{ slug: string[]; locale: string }>;
}

export default async function DownloadPage({ params }: Props) {
  const { slug } = await params;

  // Join slug parts (for long slugs like "angel/brave/charm/dream")
  const fullSlug = slug.join("/");

  // Fetch channel info
  const channel = await api.p2p.getChannel({ slug: fullSlug });

  if (!channel) {
    notFound();
  }

  return (
    <DownloadClient
      uploaderPeerId={channel.uploaderPeerId}
      fileName={channel.fileName}
      fileSize={channel.fileSize}
      hasPassword={channel.hasPassword ?? false}
      slug={fullSlug}
    />
  );
}
