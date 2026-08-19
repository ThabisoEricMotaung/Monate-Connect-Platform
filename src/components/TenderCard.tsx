import { format } from 'date-fns';

interface TenderCardProps {
  tender: {
    id: string;
    reference_number: string;
    title: string;
    buyer_normalized: string;
    closing_date: string;
    sources: string;
    estimated_budget?: number;
  };
}

export function TenderCard({ tender }: TenderCardProps) {
  const closingDate = new Date(tender.closing_date);

  // Handle invalid dates
  if (isNaN(closingDate.getTime())) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-300">
        <p className="text-gray-500">Invalid tender data: {tender.title}</p>
      </div>
    );
  }

  const today = new Date();
  const daysUntil = Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysUntil <= 7;
  const isClosed = daysUntil < 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
      isClosed ? 'border-gray-300' : isUrgent ? 'border-red-500' : 'border-blue-500'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {tender.reference_number}
            </span>
            {isUrgent && !isClosed && (
              <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">
                URGENT ({daysUntil} days)
              </span>
            )}
            {isClosed && (
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                CLOSED
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {tender.title}
          </h3>

          <p className="text-sm text-gray-600 mb-4">
            <strong>Organization:</strong> {tender.buyer_normalized}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Closes</p>
          <p className="text-sm font-medium text-gray-900">
            {format(closingDate, 'dd MMM yyyy')}
          </p>
          {!isClosed && (
            <p className={`text-xs ${isUrgent ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              {daysUntil} days left
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Time</p>
          <p className="text-sm font-medium text-gray-900">
            {format(closingDate, 'HH:mm')}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Budget</p>
          <p className="text-sm font-medium text-gray-900">
            {tender.estimated_budget ? (
              `R${(tender.estimated_budget / 1_000_000).toFixed(2)}M`
            ) : (
              <span className="text-gray-400">Not specified</span>
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Source</p>
          <p className="text-sm font-medium text-gray-900">
            {tender.sources}
          </p>
        </div>
      </div>

      <div className="pt-4">
        <a
          href={`/tenders/${tender.id}`}
          className="inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          View Details →
        </a>
      </div>
    </div>
  );
}
