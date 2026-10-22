create table profiles(id uuid primary key references auth.users on delete cascade,full_name text,role text not null default 'student');
create table books(id bigint generated always as identity primary key,title text not null,author text,year int,domain text,isbn text,rayon text,etagere int,bloc int,status text not null default 'available',lost boolean not null default false,created_at timestamptz default now());
create table loans(id bigint generated always as identity primary key,book_id bigint references books on delete cascade,user_id uuid references profiles,borrowed_at timestamptz default now(),returned_at timestamptz);
create function is_admin() returns boolean language sql security definer set search_path=public as $$select coalesce((select role='admin' from profiles where id=auth.uid()),false)$$;
create function new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email));return new;end$$;
create trigger on_signup after insert on auth.users for each row execute function new_user();
alter table profiles enable row level security;alter table books enable row level security;alter table loans enable row level security;
create policy p_read on profiles for select to authenticated using(true);
create policy p_admin on profiles for all to authenticated using(is_admin()) with check(is_admin());
create policy b_read on books for select using(true);
create policy b_admin on books for all to authenticated using(is_admin()) with check(is_admin());
create policy l_read on loans for select to authenticated using(returned_at is null or user_id=auth.uid() or is_admin());
create function borrow_book(p_book bigint) returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is null then raise exception 'Connexion requise';end if;
 update books set status='borrowed' where id=p_book and status='available' and not lost;
 if not found then raise exception 'Livre indisponible';end if;
 insert into loans(book_id,user_id) values(p_book,auth.uid());end$$;
create function return_book(p_book bigint) returns void language plpgsql security definer set search_path=public as $$begin
 update loans set returned_at=now() where book_id=p_book and returned_at is null and (user_id=auth.uid() or is_admin());
 if not found then raise exception 'Non autorisé';end if;
 update books set status='available' where id=p_book;end$$;
revoke execute on function borrow_book,return_book from public,anon;grant execute on function borrow_book,return_book to authenticated;
-- Après avoir créé votre compte (Authentication → Users), devenez administrateur :
-- update profiles set role='admin' where id=(select id from auth.users where email='VOTRE@EMAIL');
