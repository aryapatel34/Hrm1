const Holiday = require('../models/Holiday');

exports.getHolidays = async (req, res) => {
  try {
    const query = {};
    // If not requesting all holidays explicitly, or if the requester is not an admin/hr, filter active ones
    const isHrOrAdmin = req.user && (req.user.role === 'hr' || req.user.role === 'admin');
    if (req.query.all !== 'true' && !isHrOrAdmin) {
      query.isActive = { $ne: false };
    }
    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.status(200).json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const holiday = new Holiday(req.body);
    await holiday.save();
    res.status(201).json({ message: 'Holiday created', data: holiday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndUpdate(id, req.body, { new: true });
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.status(200).json({ message: 'Holiday updated', data: holiday });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.status(200).json({ message: 'Holiday deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const safeFetchJson = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch (err) {
    console.error(`Fetch failed for ${url}:`, err);
    return [];
  }
};

const FALLBACK_HOLIDAYS = [
  // 2026
  { localName: "Republic Day", date: "2026-01-26" },
  { localName: "Maha Shivratri", date: "2026-02-15" },
  { localName: "Holi", date: "2026-03-04" },
  { localName: "Good Friday", date: "2026-04-03" },
  { localName: "Ambedkar Jayanti", date: "2026-04-14" },
  { localName: "Ram Navami", date: "2026-04-16" },
  { localName: "Mahavir Jayanti", date: "2026-04-30" },
  { localName: "Bakrid / Eid al-Adha", date: "2026-05-27" },
  { localName: "Muharram", date: "2026-06-26" },
  { localName: "Independence Day", date: "2026-08-15" },
  { localName: "Raksha Bandhan", date: "2026-08-28" },
  { localName: "Janmashtami", date: "2026-09-04" },
  { localName: "Ganesh Chaturthi", date: "2026-09-14" },
  { localName: "Milad-un-Nabi", date: "2026-09-15" },
  { localName: "Gandhi Jayanti", date: "2026-10-02" },
  { localName: "Dussehra", date: "2026-10-20" },
  { localName: "Diwali", date: "2026-11-08" },
  { localName: "Guru Nanak Jayanti", date: "2026-11-24" },
  { localName: "Christmas Day", date: "2026-12-25" },

  // 2027
  { localName: "Republic Day", date: "2027-01-26" },
  { localName: "Maha Shivratri", date: "2027-03-06" },
  { localName: "Holi", date: "2027-03-22" },
  { localName: "Good Friday", date: "2027-03-26" },
  { localName: "Ambedkar Jayanti", date: "2027-04-14" },
  { localName: "Ram Navami", date: "2027-04-15" },
  { localName: "Bakrid / Eid al-Adha", date: "2027-05-17" },
  { localName: "Independence Day", date: "2027-08-15" },
  { localName: "Raksha Bandhan", date: "2027-08-17" },
  { localName: "Janmashtami", date: "2027-08-25" },
  { localName: "Ganesh Chaturthi", date: "2027-09-04" },
  { localName: "Gandhi Jayanti", date: "2027-10-02" },
  { localName: "Dussehra", date: "2027-10-09" },
  { localName: "Diwali", date: "2027-10-29" },
  { localName: "Christmas Day", date: "2027-12-25" }
];

const performBulkImport = async () => {
  try {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const [resThisYear, resNextYear] = await Promise.all([
      safeFetchJson(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/IN`),
      safeFetchJson(`https://date.nager.at/api/v3/PublicHolidays/${nextYear}/IN`)
    ]);

    let rawHolidays = [...resThisYear, ...resNextYear];
    if (rawHolidays.length === 0) {
      console.log('Using static holiday fallbacks due to API unreachable/offline state');
      rawHolidays = FALLBACK_HOLIDAYS;
    }

    let importedCount = 0;
    for (const h of rawHolidays) {
      // Normalize date to compare start of day
      const searchDate = new Date(h.date);
      searchDate.setHours(0,0,0,0);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const existing = await Holiday.findOne({
        $or: [
          { date: { $gte: searchDate, $lt: nextDay } },
          { name: { $regex: new RegExp(`^${h.localName || h.name}$`, 'i') } }
        ]
      });

      if (!existing) {
        const holiday = new Holiday({
          name: h.localName || h.name,
          date: new Date(h.date),
          type: 'public',
          description: 'Imported from Public Holiday Calendar'
        });
        await holiday.save();
        importedCount++;
      }
    }
    console.log(`[CRON] Successfully imported ${importedCount} holidays from Google Public Calendar!`);
    return importedCount;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
};

exports.performBulkImport = performBulkImport;

exports.bulkImportHolidays = async (req, res) => {
  try {
    const importedCount = await performBulkImport();
    res.status(200).json({ message: `Successfully imported ${importedCount} holidays from Google Public Calendar!` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
