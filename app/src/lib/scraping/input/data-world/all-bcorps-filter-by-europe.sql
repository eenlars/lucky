select company_name, date_certified, industry, industry_category,
country, state, city, sector, size, website
from b_corp_impact_data
WHERE current_status = 'certified'
and certification_cycle = 1
and country in ("Austria", "Belgium", "Bulgaria", "Croatia (Hrvatska)", "Cyprus", "Czech Republic", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Guernsey and Alderney", "Hungary", "Iceland", "Ireland", "Italy", "Jersey", "Latvia", "Lithuania", "Luxembourg", "Monaco", "Netherlands The", "Norway", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "United Kingdom")
and industry_category in ("Retail", "Accommodation & food service", "Human health & social work")