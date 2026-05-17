"use client";

interface ProjectData {
  name: string;
  location: string;
  plot_size: string;
  building_area: string;
  total_budget: string;
  start_date: string;
  end_date: string;
}

interface Props {
  data: ProjectData;
  onChange: (data: ProjectData) => void;
  onNext: () => void;
}

export function StepProject({ data, onChange, onNext }: Props) {
  function set(field: keyof ProjectData, value: string) {
    onChange({ ...data, [field]: value });
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    onNext();
  }

  return (
    <form onSubmit={handleNext} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Your Project</h2>
        <p className="text-sm text-gray-500 mt-1">Tell us about your construction project.</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Project name *</label>
          <input
            required
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. My Farmhouse Build"
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            value={data.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Hyderabad, Telangana"
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plot size</label>
            <input
              value={data.plot_size}
              onChange={(e) => set("plot_size", e.target.value)}
              placeholder="e.g. 500 sq yards"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building area</label>
            <input
              value={data.building_area}
              onChange={(e) => set("building_area", e.target.value)}
              placeholder="e.g. 2400 sq ft"
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total budget (₹) *</label>
          <input
            required
            type="number"
            min="0"
            value={data.total_budget}
            onChange={(e) => set("total_budget", e.target.value)}
            placeholder="e.g. 2500000"
            className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start date *</label>
            <input
              required
              type="date"
              value={data.start_date}
              onChange={(e) => set("start_date", e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End date *</label>
            <input
              required
              type="date"
              value={data.end_date}
              onChange={(e) => set("end_date", e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
      >
        Next: Phases & Deliverables →
      </button>
    </form>
  );
}
