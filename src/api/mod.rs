extern crate iron;
extern crate rusqlite;
extern crate router;
extern crate rustc_serialize;

pub mod decks;
pub mod cards;
pub mod stashes;
pub mod review;
pub mod configs;
mod backup;

use iron::status;
use router::Router;
use rustc_serialize::json;

use std::sync::Arc;

use self::decks::DecksAPI;
use self::cards::CardsAPI;
use self::stashes::StashesAPI;
use self::review::ReviewAPI;
use self::configs::ConfigsAPI;
use super::database::{DB, BootstrapError};

#[allow(non_snake_case)]
pub struct ErrorResponse<'a>  {
    status: status::Status,
    developerMessage: &'a str,
    userMessage: &'a str,
}

// Pattern from: https://github.com/WhiteHouse/api-standards#error-handling
impl<'a> ErrorResponse<'a> {

    pub fn get_raw(&self) -> __ErrorResponse {

        let response = __ErrorResponse {
            status: self.status.to_u16(),
            developerMessage: format!("{}", self.developerMessage),
            userMessage: format!("{}", self.userMessage),
        };

        return response;
    }

    pub fn to_json(&self) -> String {
        let ref raw_err = self.get_raw();
        return json::encode(raw_err).unwrap();
    }
}

// less-hacky alternative to https://doc.rust-lang.org/error-index.html#E0117
//
// this struct is essentially the same as above; but is "encodable"-friendly for
// rustc_serialize.
//
#[allow(non_snake_case)]
#[derive(RustcEncodable)]
pub struct __ErrorResponse  {
    status: u16,
    developerMessage: String,
    userMessage: String,
}

// TODO: this is a horrible hack! definitely not doing this; prefer above as alternative
// see:
// - https://internals.rust-lang.org/t/named-trait-instances/2823
// - https://doc.rust-lang.org/error-index.html#E0117
// - https://gist.github.com/DanielKeep/f0c0d882241af4e69a19
//
// pub trait Encodable {
//     fn encode<S: rustc_serialize::Encoder>(&self, s: &mut S) -> Result<(), S::Error>;
// }
// impl Encodable for status::Status {
//     fn encode<S: rustc_serialize::Encoder>(&self, s: &mut S) -> Result<(), S::Error> {
//         let foo = *self;
//         return s.emit_u16(foo.to_u16());
//     }
// }

#[derive(Debug, Clone)]
pub struct GrokDB {
    pub base_db_name: String,
    pub backup_base_dest: Option<String>,

    pub decks: DecksAPI,
    pub cards: CardsAPI,
    pub stashes: StashesAPI,
    pub review: ReviewAPI,
    pub configs: ConfigsAPI,
}

pub fn new(database_name: String) -> Result<GrokDB, BootstrapError> {

    // open db connection and bootstrap it
    let db_conn: Result<DB, BootstrapError> = super::database::bootstrap(database_name.clone());

    let db: Arc<DB> = Arc::new(try!(db_conn));

    // fetch base db name
    let mut base_db_name: String = format!("{}", database_name);

    if base_db_name.to_lowercase().ends_with(".db") {
        let lower = base_db_name.to_lowercase();
        let slice: Vec<_> = lower.split(".db").collect();
        base_db_name = format!("{}", slice[0]);
    }
    let base_db_name = base_db_name;


    let api = GrokDB {
        base_db_name: base_db_name,
        backup_base_dest: None,

        decks: DecksAPI {
            db: db.clone()
        },
        cards: CardsAPI {
            db: db.clone()
        },
        stashes: StashesAPI {
            db: db.clone()
        },
        review: ReviewAPI {
            db: db.clone()
        },
        configs: ConfigsAPI {
            db: db.clone()
        },
    };

    return Ok(api);
}

pub fn restify(router: &mut Router, grokdb: GrokDB) {

    backup::restify(router, grokdb.clone());

    decks::restify(router, grokdb.clone());

    cards::restify(router, grokdb.clone());

    stashes::restify(router, grokdb.clone());

    review::restify(router, grokdb.clone());

    configs::restify(router, grokdb.clone());
}

