update profiles
set verification_status = 'Verified'
where verification_status is not null
  and lower(verification_status) like '%verified%'
  and lower(verification_status) not like '%unverified%'
  and verification_status <> 'Verified';

update supplier_bank_details
set verification_status = 'Verified'
where verification_status is not null
  and lower(verification_status) like '%verified%'
  and lower(verification_status) not like '%unverified%'
  and verification_status <> 'Verified';
