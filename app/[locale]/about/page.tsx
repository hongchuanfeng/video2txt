import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('about');
  return {
    title: `${t('title')} - SRT to Text Converter`,
    description: t('description'),
    alternates: {
      canonical: 'https://barcode.zorezoro.com/about',
    },
  };
}

export default async function AboutPage() {
  const t = await getTranslations('about');

  const teamMembers = [
    { key: 'member1' },
    { key: 'member2' },
    { key: 'member3' },
    { key: 'member4' },
    { key: 'member5' },
    { key: 'member6' },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">{t('title')}</h1>
        <p className="text-xl text-gray-600 text-center mb-12">{t('description')}</p>

        {/* Mission Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8">
          <h2 className="text-3xl font-bold mb-4 text-primary-600">{t('mission.title')}</h2>
          <p className="text-lg text-gray-700 leading-relaxed">{t('mission.content')}</p>
        </div>

        {/* Vision Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8">
          <h2 className="text-3xl font-bold mb-4 text-primary-600">{t('vision.title')}</h2>
          <p className="text-lg text-gray-700 leading-relaxed">{t('vision.content')}</p>
        </div>

        {/* Values Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8">
          <h2 className="text-3xl font-bold mb-4 text-primary-600">{t('values.title')}</h2>
          <p className="text-lg text-gray-700 leading-relaxed">{t('values.content')}</p>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12 mb-8">
          <h2 className="text-3xl font-bold mb-4 text-primary-600">{t('history.title')}</h2>
          <p className="text-lg text-gray-700 leading-relaxed">{t('history.content')}</p>
        </div>

        {/* Team Section */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{t('team.title')}</h2>
          <p className="text-xl text-gray-600 text-center mb-8">{t('team.subtitle')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl font-bold text-primary-600">
                    {t(`team.${member.key}.name`).charAt(0)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-center mb-2">{t(`team.${member.key}.name`)}</h3>
                <p className="text-primary-600 text-center mb-3 font-medium">{t(`team.${member.key}.role`)}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{t(`team.${member.key}.bio`)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose Us Section */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg shadow-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold mb-6 text-center">{t('whyChooseUs.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-2">{t('whyChooseUs.feature1.title')}</h3>
              <p className="text-gray-600">{t('whyChooseUs.feature1.description')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">{t('whyChooseUs.feature2.title')}</h3>
              <p className="text-gray-600">{t('whyChooseUs.feature2.description')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💯</div>
              <h3 className="text-xl font-semibold mb-2">{t('whyChooseUs.feature3.title')}</h3>
              <p className="text-gray-600">{t('whyChooseUs.feature3.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
