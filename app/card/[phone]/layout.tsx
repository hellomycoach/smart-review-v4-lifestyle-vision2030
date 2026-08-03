import type { Metadata } from 'next';

type Props = {
  params: { phone: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const title = `Carte de Fidélité VIP`;
  const description = `Présentez votre carte en caisse pour accumuler vos tampons et débloquer vos cadeaux VIP !`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function CardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
