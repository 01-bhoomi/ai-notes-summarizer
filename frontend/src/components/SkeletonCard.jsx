const SkeletonCard = () => {
  return (
    <div className="note-card skeleton-card">
      <div className="skeleton-line skeleton-title"></div>
      <div className="skeleton-line skeleton-text"></div>
      <div className="skeleton-line skeleton-text short"></div>
      <div className="skeleton-line skeleton-meta"></div>
    </div>
  );
};

export default SkeletonCard;