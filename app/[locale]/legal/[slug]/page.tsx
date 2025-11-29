import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

const legalPages = ['privacy', 'terms', 'refund', 'disclaimer', 'copyright', 'legal', 'ip'];

export async function generateStaticParams() {
  return legalPages.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = params;
  if (!legalPages.includes(slug)) {
    notFound();
  }

  const t = await getTranslations(`legal.${slug}`);
  return {
    title: `${t('title')} - SRT to Text Converter`,
    description: t('content'),
    alternates: {
      canonical: `https://barcode.zorezoro.com/legal/${slug}`,
    },
  };
}

export default async function LegalPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  if (!legalPages.includes(slug)) {
    notFound();
  }

  const t = await getTranslations(`legal.${slug}`);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">{t('title')}</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 md:p-12">
          <div className="prose max-w-none">
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              {t('content')}
            </p>

            {/* Copyright Page Detailed Content */}
            {slug === 'copyright' && (
              <div className="space-y-8">
                {t('intro') && (
                  <div>
                    <p className="text-gray-700 leading-relaxed">{t('intro')}</p>
                  </div>
                )}
                
                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('ownership.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('ownership.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('userContent.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('userContent.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('protected.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('protected.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('permissions.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('permissions.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('violations.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('violations.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('enforcement.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('enforcement.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('updates.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('updates.content')}</p>
                </div>

                <div className="bg-primary-50 rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('contact.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('contact.content')}</p>
                </div>
              </div>
            )}

            {/* Legal Notice Page Detailed Content */}
            {slug === 'legal' && (
              <div className="space-y-8">
                {t('intro') && (
                  <div>
                    <p className="text-gray-700 leading-relaxed">{t('intro')}</p>
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('jurisdiction.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('jurisdiction.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('compliance.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('compliance.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('dataProtection.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('dataProtection.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('liability.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('liability.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('warranties.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('warranties.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('indemnification.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('indemnification.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('modifications.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('modifications.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('severability.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('severability.content')}</p>
                </div>

                <div className="bg-primary-50 rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('contact.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('contact.content')}</p>
                </div>
              </div>
            )}

            {/* Intellectual Property Page Detailed Content */}
            {slug === 'ip' && (
              <div className="space-y-8">
                {t('intro') && (
                  <div>
                    <p className="text-gray-700 leading-relaxed">{t('intro')}</p>
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('scope.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('scope.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('copyrights.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('copyrights.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('trademarks.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('trademarks.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('patents.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('patents.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('software.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('software.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('userRights.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('userRights.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('prohibited.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('prohibited.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('enforcement.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('enforcement.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('licensing.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('licensing.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('thirdParty.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('thirdParty.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('updates.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('updates.content')}</p>
                </div>

                <div className="bg-primary-50 rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('contact.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('contact.content')}</p>
                </div>
              </div>
            )}

            {/* Privacy Policy Page Detailed Content */}
            {slug === 'privacy' && (
              <div className="space-y-8">
                {t('intro') && (
                  <div>
                    <p className="text-gray-700 leading-relaxed mb-2">{t('intro')}</p>
                    {t('lastUpdated') && (
                      <p className="text-sm text-gray-500 italic">{t('lastUpdated')}</p>
                    )}
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('informationCollection.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('informationCollection.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('informationCollection.items.item1')}</li>
                    <li>{t('informationCollection.items.item2')}</li>
                    <li>{t('informationCollection.items.item3')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('howWeUse.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('howWeUse.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('howWeUse.items.item1')}</li>
                    <li>{t('howWeUse.items.item2')}</li>
                    <li>{t('howWeUse.items.item3')}</li>
                    <li>{t('howWeUse.items.item4')}</li>
                    <li>{t('howWeUse.items.item5')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('dataStorage.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('dataStorage.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('cookies.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('cookies.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('cookies.items.item1')}</li>
                    <li>{t('cookies.items.item2')}</li>
                    <li>{t('cookies.items.item3')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('thirdParty.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('thirdParty.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('dataRetention.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('dataRetention.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('yourRights.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('yourRights.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('yourRights.items.item1')}</li>
                    <li>{t('yourRights.items.item2')}</li>
                    <li>{t('yourRights.items.item3')}</li>
                    <li>{t('yourRights.items.item4')}</li>
                    <li>{t('yourRights.items.item5')}</li>
                  </ul>
                  <p className="text-gray-700 leading-relaxed mt-4">{t('yourRights.contact')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('children.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('children.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('international.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('international.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('changes.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('changes.content')}</p>
                </div>

                <div className="bg-primary-50 rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('contact.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('contact.content')}</p>
                </div>
              </div>
            )}

            {/* Terms of Service Page Detailed Content */}
            {slug === 'terms' && (
              <div className="space-y-8">
                {t('intro') && (
                  <div>
                    <p className="text-gray-700 leading-relaxed mb-2">{t('intro')}</p>
                    {t('lastUpdated') && (
                      <p className="text-sm text-gray-500 italic">{t('lastUpdated')}</p>
                    )}
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('acceptance.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('acceptance.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('description.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('description.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('userAccount.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('userAccount.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('acceptableUse.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('acceptableUse.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('acceptableUse.items.item1')}</li>
                    <li>{t('acceptableUse.items.item2')}</li>
                    <li>{t('acceptableUse.items.item3')}</li>
                    <li>{t('acceptableUse.items.item4')}</li>
                    <li>{t('acceptableUse.items.item5')}</li>
                    <li>{t('acceptableUse.items.item6')}</li>
                    <li>{t('acceptableUse.items.item7')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('userContent.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('userContent.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('intellectualProperty.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('intellectualProperty.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('prohibited.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('prohibited.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('prohibited.items.item1')}</li>
                    <li>{t('prohibited.items.item2')}</li>
                    <li>{t('prohibited.items.item3')}</li>
                    <li>{t('prohibited.items.item4')}</li>
                    <li>{t('prohibited.items.item5')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('disclaimers.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('disclaimers.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('limitation.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('limitation.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('indemnification.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('indemnification.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('termination.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('termination.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('modifications.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('modifications.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('governingLaw.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('governingLaw.content')}</p>
                </div>

                <div className="bg-primary-50 rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('contact.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('contact.content')}</p>
                </div>
              </div>
            )}

            {/* Refund Policy Page Detailed Content */}
            {slug === 'refund' && (
              <div className="space-y-8">
                {t('intro') && (
                  <div>
                    <p className="text-gray-700 leading-relaxed mb-2">{t('intro')}</p>
                    {t('lastUpdated') && (
                      <p className="text-sm text-gray-500 italic">{t('lastUpdated')}</p>
                    )}
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('freeService.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('freeService.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('noCharges.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('noCharges.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('noCharges.items.item1')}</li>
                    <li>{t('noCharges.items.item2')}</li>
                    <li>{t('noCharges.items.item3')}</li>
                    <li>{t('noCharges.items.item4')}</li>
                    <li>{t('noCharges.items.item5')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('serviceIssues.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('serviceIssues.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('serviceIssues.items.item1')}</li>
                    <li>{t('serviceIssues.items.item2')}</li>
                    <li>{t('serviceIssues.items.item3')}</li>
                    <li>{t('serviceIssues.items.item4')}</li>
                  </ul>
                  <p className="text-gray-700 leading-relaxed mt-4">{t('serviceIssues.contact')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('futureChanges.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('futureChanges.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('futureChanges.items.item1')}</li>
                    <li>{t('futureChanges.items.item2')}</li>
                    <li>{t('futureChanges.items.item3')}</li>
                    <li>{t('futureChanges.items.item4')}</li>
                  </ul>
                  {t('futureChanges.note') && (
                    <p className="text-gray-600 italic mt-4">{t('futureChanges.note')}</p>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('donations.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('donations.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('thirdParty.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('thirdParty.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('satisfaction.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('satisfaction.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('disputes.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('disputes.content')}</p>
                </div>

                <div className="bg-primary-50 rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('contact.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('contact.content')}</p>
                </div>
              </div>
            )}

            {/* Disclaimer Page Detailed Content */}
            {slug === 'disclaimer' && (
              <div className="space-y-8">
                {t('intro') && (
                  <div>
                    <p className="text-gray-700 leading-relaxed mb-2">{t('intro')}</p>
                    {t('lastUpdated') && (
                      <p className="text-sm text-gray-500 italic">{t('lastUpdated')}</p>
                    )}
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('noWarranties.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('noWarranties.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('noWarranties.items.item1')}</li>
                    <li>{t('noWarranties.items.item2')}</li>
                    <li>{t('noWarranties.items.item3')}</li>
                    <li>{t('noWarranties.items.item4')}</li>
                    <li>{t('noWarranties.items.item5')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('accuracy.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('accuracy.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('accuracy.items.item1')}</li>
                    <li>{t('accuracy.items.item2')}</li>
                    <li>{t('accuracy.items.item3')}</li>
                    <li>{t('accuracy.items.item4')}</li>
                  </ul>
                  {t('accuracy.note') && (
                    <p className="text-gray-700 leading-relaxed mt-4 font-medium">{t('accuracy.note')}</p>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('dataLoss.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('dataLoss.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('dataLoss.items.item1')}</li>
                    <li>{t('dataLoss.items.item2')}</li>
                    <li>{t('dataLoss.items.item3')}</li>
                    <li>{t('dataLoss.items.item4')}</li>
                  </ul>
                  {t('dataLoss.recommendation') && (
                    <p className="text-gray-700 leading-relaxed mt-4 font-medium bg-yellow-50 p-4 rounded-lg">{t('dataLoss.recommendation')}</p>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('limitation.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('limitation.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('limitation.items.item1')}</li>
                    <li>{t('limitation.items.item2')}</li>
                    <li>{t('limitation.items.item3')}</li>
                    <li>{t('limitation.items.item4')}</li>
                    <li>{t('limitation.items.item5')}</li>
                  </ul>
                  {t('limitation.note') && (
                    <p className="text-gray-600 italic mt-4">{t('limitation.note')}</p>
                  )}
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('thirdParty.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('thirdParty.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('thirdParty.items.item1')}</li>
                    <li>{t('thirdParty.items.item2')}</li>
                    <li>{t('thirdParty.items.item3')}</li>
                    <li>{t('thirdParty.items.item4')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('technical.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('technical.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('technical.items.item1')}</li>
                    <li>{t('technical.items.item2')}</li>
                    <li>{t('technical.items.item3')}</li>
                    <li>{t('technical.items.item4')}</li>
                    <li>{t('technical.items.item5')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('useAtOwnRisk.title')}</h2>
                  <p className="text-gray-700 leading-relaxed mb-4">{t('useAtOwnRisk.content')}</p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                    <li>{t('useAtOwnRisk.items.item1')}</li>
                    <li>{t('useAtOwnRisk.items.item2')}</li>
                    <li>{t('useAtOwnRisk.items.item3')}</li>
                    <li>{t('useAtOwnRisk.items.item4')}</li>
                    <li>{t('useAtOwnRisk.items.item5')}</li>
                  </ul>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('jurisdiction.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('jurisdiction.content')}</p>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('changes.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('changes.content')}</p>
                </div>

                <div className="bg-primary-50 rounded-lg p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-primary-600">{t('contact.title')}</h2>
                  <p className="text-gray-700 leading-relaxed">{t('contact.content')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
